"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";
import { requireAdmin } from "@/server/guards";
import { parseCsvRecords, splitPipes } from "@/lib/csv";
import {
  makeGetter,
  parseAedToFils,
  parseBool,
  parseCategoryPath,
  parseColorOptions,
  parseSizeOptions,
  slugify,
} from "@/lib/product-csv";

/**
 * Bulk product upload for the retail shop, on the single-price attribute model:
 * Size and Colour are option lists on the product, not separately-priced rows.
 * `SKU` is the key — a row whose SKU already exists updates that product, a new
 * SKU inserts one.
 *
 * The whole file is not one transaction. Neon's HTTP driver has no interactive
 * transactions, and a 200-row upload where row 150 is malformed is far more
 * useful half-applied with a precise "row 150: …" than rolled back whole. Each
 * product's own writes (its row plus its images) do go through one batch(), so
 * no single product is ever left half-written.
 */

// Kept under Next's default Server Actions body limit so the upload reaches the
// action rather than being rejected upstream. 1 MB is thousands of rows of CSV.
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ROWS = 2000;
const MAX_IMAGES = 20;
const MAX_ERRORS_REPORTED = 100;
const REQUIRED_HEADERS = ["SKU", "Name", "Category", "Price (AED)"];

export interface ImportReport {
  ok: boolean;
  /** A fatal problem with the file itself; when set, nothing was imported. */
  error?: string;
  created: number;
  updated: number;
  categoriesCreated: number;
  skipped: number;
  rowErrors: { row: number; message: string }[];
}

/** A row-level validation failure, carrying a message meant for the uploader. */
class RowError extends Error {}

function fatal(error: string): ImportReport {
  return {
    ok: false,
    error,
    created: 0,
    updated: 0,
    categoriesCreated: 0,
    skipped: 0,
    rowErrors: [],
  };
}

export async function importProductsAction(
  _prev: ImportReport | null,
  formData: FormData,
): Promise<ImportReport> {
  try {
    const admin = await requireAdmin();

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fatal("Choose a CSV file to upload.");
    }
    if (file.size > MAX_FILE_BYTES) {
      return fatal("That file is larger than 1 MB. Split it into smaller uploads.");
    }

    const { headers, records } = parseCsvRecords(await file.text());

    const present = new Set(headers.map((header) => header.trim().toLowerCase()));
    const missing = REQUIRED_HEADERS.filter(
      (header) => !present.has(header.toLowerCase()),
    );
    if (missing.length > 0) {
      return fatal(
        `This doesn't look like the product template — missing column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Download the template to see the expected columns.`,
      );
    }
    if (records.length === 0) {
      return fatal("The file has a header row but no products.");
    }
    if (records.length > MAX_ROWS) {
      return fatal(`That file has ${records.length} rows; the limit is ${MAX_ROWS} per upload.`);
    }

    // Preload the lookups the loop needs, so it does not issue one query per row
    // just to resolve a category or find an existing SKU.
    const categoryRows = await db
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(inArray(categories.kind, ["retail", "both"]));
    const categoryBySlug = new Map(
      categoryRows.map((row) => [row.slug.toLowerCase(), row.id]),
    );

    const skuRows = await db
      .select({ id: products.id, sku: products.sku })
      .from(products)
      .where(isNotNull(products.sku));
    const productBySku = new Map(
      skuRows.map((row) => [row.sku!.toLowerCase(), row.id]),
    );

    let created = 0;
    let updated = 0;
    let categoriesCreated = 0;
    let skipped = 0;
    const rowErrors: { row: number; message: string }[] = [];

    /**
     * Resolves a category path to its leaf id, creating any missing levels.
     * Slugs are globally unique per kind, so an existing level is reused
     * wherever it sits rather than duplicated under a new parent.
     */
    async function resolveCategory(pathNames: string[]): Promise<string> {
      if (pathNames.length === 0) throw new RowError("Category is required.");

      let parentId: string | null = null;
      let leafId = "";

      for (const [depth, name] of pathNames.entries()) {
        const slug = slugify(name);
        if (!slug) throw new RowError(`Category segment "${name}" is not usable.`);

        const existing = categoryBySlug.get(slug);
        if (existing) {
          parentId = existing;
          leafId = existing;
          continue;
        }

        // Explicit type: the categories.parentId self-reference makes Drizzle's
        // inferred returning type recurse, which TS collapses to a circular any.
        const inserted: { id: string }[] = await db
          .insert(categories)
          .values({
            name,
            slug,
            kind: "retail",
            parentId,
            sortOrder: (depth + 1) * 10,
            active: true,
          })
          .returning({ id: categories.id });
        const newId = inserted[0].id;

        categoriesCreated += 1;
        categoryBySlug.set(slug, newId);
        parentId = newId;
        leafId = newId;
      }

      return leafId;
    }

    for (const record of records) {
      try {
        const get = makeGetter(record.values);

        const sku = get("SKU");
        if (!sku) {
          throw new RowError("SKU is required — it is the key that matches an existing product.");
        }

        const name = get("Name");
        if (!name) throw new RowError("Name is required.");

        const priceFils = parseAedToFils(get("Price (AED)") || get("Price"));
        if (priceFils === null) {
          throw new RowError("Price must be a number like 230 or 230.50.");
        }

        const images = splitPipes(get("Images")).slice(0, MAX_IMAGES);
        for (const url of images) {
          if (!isHttpUrl(url)) {
            throw new RowError(`Image "${truncate(url)}" is not a valid http(s) URL.`);
          }
        }

        const categoryId = await resolveCategory(parseCategoryPath(get("Category")));

        const values = {
          name,
          description: get("Description") || null,
          priceFils,
          categoryId,
          sku,
          sizeOptions: parseSizeOptions(get("Sizes")),
          colorOptions: parseColorOptions(get("Colors")),
          inStock: parseBool(get("In stock"), true),
          active: parseBool(get("Published"), true),
          sortOrder: parseSortOrder(get("Sort order")),
        };

        const existingId = productBySku.get(sku.toLowerCase());

        if (existingId) {
          // batch() is one server-side transaction, so the row and its images
          // move together. Images are only replaced when the sheet lists some —
          // a blank Images cell keeps whatever is already attached.
          if (images.length > 0) {
            await db.batch([
              db.update(products).set({ ...values, updatedAt: new Date() }).where(eq(products.id, existingId)),
              db.delete(productImages).where(eq(productImages.productId, existingId)),
              db.insert(productImages).values(imageRows(existingId, name, images)),
            ]);
          } else {
            await db.update(products).set({ ...values, updatedAt: new Date() }).where(eq(products.id, existingId));
          }
          updated += 1;
        } else {
          const id = randomUUID();
          if (images.length > 0) {
            await db.batch([
              db.insert(products).values({ id, ...values, createdBy: admin.id }),
              db.insert(productImages).values(imageRows(id, name, images)),
            ]);
          } else {
            await db.insert(products).values({ id, ...values, createdBy: admin.id });
          }
          // A repeated SKU later in the same file now updates this new row
          // rather than colliding on the unique index.
          productBySku.set(sku.toLowerCase(), id);
          created += 1;
        }
      } catch (error) {
        skipped += 1;
        if (rowErrors.length < MAX_ERRORS_REPORTED) {
          rowErrors.push({
            row: record.row,
            message: error instanceof RowError ? error.message : "Could not be saved.",
          });
        }
        if (!(error instanceof RowError)) {
          console.error(`Import row ${record.row} failed`, error);
        }
      }
    }

    if (created + updated + categoriesCreated > 0) {
      revalidatePath("/shop");
      revalidatePath("/");
      revalidatePath("/admin/shop");
      revalidatePath("/admin/categories");
    }

    return { ok: true, created, updated, categoriesCreated, skipped, rowErrors };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN")
    ) {
      return fatal("You do not have permission to import products.");
    }
    console.error("Product import failed", error);
    return fatal("The import could not be completed. The file may be corrupt.");
  }
}

function imageRows(productId: string, alt: string, paths: string[]) {
  return paths.map((path, index) => ({ productId, path, alt, sortOrder: index }));
}

function parseSortOrder(cell: string): number {
  const parsed = Number.parseInt(cell, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 9999);
}

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function truncate(value: string): string {
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}
