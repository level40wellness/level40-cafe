"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";
import {
  cleanText,
  MAX_DESCRIPTION,
  MAX_NAME,
  MAX_NUTRITION,
  MAX_PRICE_AED,
  nameKey,
  normaliseNutrition,
  validateRow,
} from "@/lib/menu-photo-name";
import { requireAdmin } from "@/server/guards";
import { fromUnknownError } from "./result";

/**
 * Photo-driven café menu import. The browser parses the file names, resizes and
 * uploads each photo straight to Blob (see /api/admin/blob), then sends the
 * parsed rows here in small chunks — only URLs and text cross this boundary,
 * never image bytes, so a 60-photo import is never close to the 1 MB action
 * body limit or a function timeout.
 *
 * Matching is by café item name (case- and accent-composition-insensitive):
 *  - no match   → a new item at the end of the chosen category;
 *  - one match  → an update. Price is always applied; description and nutrition
 *                 only when the file name supplied them, so a bare "Name-19.png"
 *                 never blanks text an admin wrote. The photo is added as the
 *                 item's primary one and the old ones follow it (max 5).
 *  - >1 matches → refused for that row; guessing which duplicate to change
 *                 would silently edit the wrong dish.
 *
 * One chunk is not a transaction (Neon's HTTP driver has none), but each item's
 * own writes go through db.batch(), so no item is left half-written, and a row
 * failing never rolls back or blocks the others.
 */

const MAX_ITEMS_PER_CALL = 25;
const MAX_IMAGES = 5;

const itemSchema = z.object({
  name: z.string().max(MAX_NAME * 2),
  description: z.string().max(MAX_DESCRIPTION * 2),
  nutrition: z.string().max(MAX_NUTRITION * 2),
  priceAed: z.number().finite().min(0).max(MAX_PRICE_AED).nullable(),
  categoryId: z.uuid(),
  imageUrl: z.url().max(1000),
});
const inputSchema = z.array(itemSchema).min(1).max(MAX_ITEMS_PER_CALL);

export type MenuPhotoItem = z.infer<typeof itemSchema>;

export interface MenuPhotoItemResult {
  /** Position in the submitted array, so the UI can map it back to its row. */
  index: number;
  status: "created" | "updated" | "failed";
  message: string;
}

export interface MenuPhotoImportResult {
  ok: boolean;
  /** A problem with the whole call (permission, malformed payload). */
  error?: string;
  results: MenuPhotoItemResult[];
}

function fail(error: string): MenuPhotoImportResult {
  return { ok: false, error, results: [] };
}

/**
 * Only our own Blob store may back a menu photo. Without this a forged request
 * could attach any URL, and the storefront would then render (and next/image
 * would try to fetch) an address an attacker chose.
 */
function isBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function importMenuPhotosAction(input: MenuPhotoItem[]): Promise<MenuPhotoImportResult> {
  try {
    const admin = await requireAdmin();

    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return fail("The import request was malformed. Reload the page and try again.");
    const items = parsed.data;

    const categoryRows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.kind, ["cafe", "both"]));
    const usableCategories = new Set(categoryRows.map((row) => row.id));

    const existing = usableCategories.size
      ? await db.query.products.findMany({
          where: inArray(products.categoryId, [...usableCategories]),
          columns: { id: true, name: true, categoryId: true, sortOrder: true, priceFils: true, active: true },
          with: { images: { columns: { path: true }, orderBy: (image, { asc }) => [asc(image.sortOrder)] } },
        })
      : [];

    type Known = (typeof existing)[number];
    const byName = new Map<string, Known[]>();
    const nextSort = new Map<string, number>();
    for (const row of existing) {
      const key = nameKey(row.name);
      byName.set(key, [...(byName.get(key) ?? []), row]);
      nextSort.set(row.categoryId!, Math.max(nextSort.get(row.categoryId!) ?? 0, row.sortOrder));
    }

    const results: MenuPhotoItemResult[] = [];

    for (const [index, item] of items.entries()) {
      const done = (status: MenuPhotoItemResult["status"], message: string) =>
        results.push({ index, status, message });

      try {
        const name = cleanText(item.name);
        const description = cleanText(item.description);
        const nutrition = normaliseNutrition(item.nutrition);
        const priceAed = item.priceAed !== null && item.priceAed > 0 ? Math.round(item.priceAed * 100) / 100 : null;

        const problems = validateRow({ name, description, nutrition, priceAed }).errors;
        if (problems.length > 0) {
          done("failed", problems[0]);
          continue;
        }
        if (!isBlobUrl(item.imageUrl)) {
          done("failed", "The photo was not uploaded correctly. Try this row again.");
          continue;
        }
        if (!usableCategories.has(item.categoryId)) {
          done("failed", "That category no longer exists or is not on the café menu.");
          continue;
        }

        const key = nameKey(name);
        const matches = byName.get(key) ?? [];

        if (matches.length > 1) {
          done("failed", "Several menu items already share this name — rename one in the menu first.");
          continue;
        }

        if (matches.length === 1) {
          const current = matches[0];
          const priceFils = priceAed === null ? current.priceFils : Math.round(priceAed * 100);
          // Only the placeholder state this importer itself creates (hidden at
          // 0) is switched on; an item an admin hid on purpose stays hidden.
          const reveal = priceAed !== null && current.priceFils === 0 && !current.active;
          const kept = current.images.map((image) => image.path).filter((path) => path !== item.imageUrl);
          const gallery = [item.imageUrl, ...kept].slice(0, MAX_IMAGES);

          await db.batch([
            db
              .update(products)
              .set({
                priceFils,
                ...(description ? { description } : {}),
                ...(nutrition ? { nutrition } : {}),
                ...(reveal ? { active: true } : {}),
                updatedAt: new Date(),
              })
              .where(eq(products.id, current.id)),
            db.delete(productImages).where(eq(productImages.productId, current.id)),
            db.insert(productImages).values(
              gallery.map((path, position) => ({ productId: current.id, path, alt: name, sortOrder: position })),
            ),
          ]);

          current.priceFils = priceFils;
          if (reveal) current.active = true;
          current.images = gallery.map((path) => ({ path }));
          done("updated", reveal ? "Updated and now visible on the menu." : "Updated.");
          continue;
        }

        const id = randomUUID();
        const sortOrder = (nextSort.get(item.categoryId) ?? 0) + 10;
        nextSort.set(item.categoryId, sortOrder);

        await db.batch([
          db.insert(products).values({
            id,
            name,
            description: description || null,
            nutrition: nutrition || null,
            priceFils: priceAed === null ? 0 : Math.round(priceAed * 100),
            categoryId: item.categoryId,
            // price is NOT NULL and the storefront has no "price on request"
            // state, so a priceless item stays hidden until an admin prices it.
            active: priceAed !== null,
            sortOrder,
            createdBy: admin.id,
          }),
          db.insert(productImages).values({ productId: id, path: item.imageUrl, alt: name, sortOrder: 0 }),
        ]);

        // A second photo for the same name later in this call is then an update.
        byName.set(key, [
          {
            id,
            name,
            categoryId: item.categoryId,
            sortOrder,
            priceFils: priceAed === null ? 0 : Math.round(priceAed * 100),
            active: priceAed !== null,
            images: [{ path: item.imageUrl }],
          },
        ]);
        done("created", priceAed === null ? "Added, hidden until you set a price." : "Added.");
      } catch (error) {
        console.error(`Menu photo import item ${index} failed`, error);
        done("failed", "Could not be saved.");
      }
    }

    if (results.some((result) => result.status !== "failed")) {
      revalidatePath("/menu");
      revalidatePath("/");
      revalidatePath("/admin/menu");
    }

    return { ok: true, results };
  } catch (error) {
    const result = fromUnknownError(error, "The import could not be completed.");
    return fail(result.ok ? "The import could not be completed." : result.error);
  }
}
