"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";
import { requireAdmin } from "@/server/guards";
// Prices are entered in AED and stored in fils. The size/colour parsers are
// shared with the CSV importer so a variant typed in the form and one uploaded
// in a sheet are stored identically. Both accept the same `|`-separated format.
import {
  parseAedToFils,
  parseColorOptions,
  parseSizeOptions,
} from "@/lib/product-csv";
import {
  type ActionResult,
  fromUnknownError,
  fromZodError,
} from "./result";

const MAX_IMAGES = 5;

const imageSchema = z.object({
  path: z.url("Each image must be a URL."),
  alt: z.string().trim().max(160).optional(),
});

const productSchema = z.object({
  // Which side of the catalogue the editor was opened from. Carried in the
  // form because a "use server" module may only export async functions, so the
  // action cannot be a closure over it.
  kind: z.enum(["cafe", "retail"]),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.string().trim(),
  categoryId: z.uuid("Choose a category."),
  emoji: z.string().trim().max(8).optional(),
  tags: z.string().trim().max(300).optional(),
  nutrition: z
    .string()
    .trim()
    .max(300, "Keep the nutrition line under 300 characters.")
    .optional(),
  sizes: z.string().trim().max(400).optional(),
  colors: z.string().trim().max(800).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  inStock: z.boolean(),
  active: z.boolean(),
  images: z.array(imageSchema).max(MAX_IMAGES),
});

function parse(formData: FormData) {
  let images: unknown = [];

  try {
    images = JSON.parse(String(formData.get("images") ?? "[]"));
  } catch {
    return {
      success: false as const,
      result: { ok: false as const, error: "The image list was malformed." },
    };
  }

  const parsed = productSchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price") ?? "",
    categoryId: formData.get("categoryId"),
    emoji: formData.get("emoji") || undefined,
    tags: formData.get("tags") || undefined,
    nutrition: formData.get("nutrition") || undefined,
    sizes: formData.get("sizes") || undefined,
    colors: formData.get("colors") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
    inStock: formData.get("inStock") === "on",
    active: formData.get("active") === "on",
    images,
  });

  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, result: fromZodError(parsed.error) };
}

function splitTags(value: string | undefined) {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);
}

function revalidateCatalog(productId?: string) {
  revalidatePath("/menu");
  revalidatePath("/shop");
  revalidatePath("/");
  if (productId) revalidatePath(`/shop/${productId}`);
  revalidatePath("/admin/menu");
  revalidatePath("/admin/shop");
}

/**
 * A product must land in a category that actually exists and matches the side
 * of the catalogue it was created from. Without this, a request could be
 * replayed with any category id and file a yoga mat under Desserts — the form
 * only ever offers valid options, but the form is not what we receive.
 */
async function assertCategoryUsable(
  categoryId: string,
  kind: "cafe" | "retail",
): Promise<ActionResult | null> {
  const [category] = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (!category) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: { categoryId: "That category no longer exists." },
    };
  }

  if (category.kind !== kind && category.kind !== "both") {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: {
        categoryId: `That category does not belong to the ${kind === "cafe" ? "café menu" : "retail shop"}.`,
      },
    };
  }

  return null;
}

export async function createProductAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const parsed = parse(formData);
    if (!parsed.success) return parsed.result;

    const priceFils = parseAedToFils(parsed.data.price);
    if (priceFils === null) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { price: "Enter an amount like 42 or 42.50." },
      };
    }

    const categoryProblem = await assertCategoryUsable(
      parsed.data.categoryId,
      parsed.data.kind,
    );
    if (categoryProblem) return categoryProblem;

    const [created] = await db
      .insert(products)
      .values({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        priceFils,
        categoryId: parsed.data.categoryId,
        emoji: parsed.data.emoji ?? null,
        tags: splitTags(parsed.data.tags),
        nutrition: parsed.data.nutrition ?? null,
        sizeOptions: parseSizeOptions(parsed.data.sizes ?? ""),
        colorOptions: parseColorOptions(parsed.data.colors ?? ""),
        sortOrder: parsed.data.sortOrder,
        inStock: parsed.data.inStock,
        active: parsed.data.active,
        createdBy: admin.id,
      })
      .returning({ id: products.id });

    if (parsed.data.images.length > 0) {
      await db.insert(productImages).values(
        parsed.data.images.map((image, index) => ({
          productId: created.id,
          path: image.path,
          alt: image.alt ?? null,
          sortOrder: index,
        })),
      );
    }

    revalidateCatalog(created.id);
    return { ok: true, message: `"${parsed.data.name}" created.` };
  } catch (error) {
    return fromUnknownError(error, "Could not create the product.");
  }
}

export async function updateProductAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown product." };

    const parsed = parse(formData);
    if (!parsed.success) return parsed.result;

    const priceFils = parseAedToFils(parsed.data.price);
    if (priceFils === null) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { price: "Enter an amount like 42 or 42.50." },
      };
    }

    const categoryProblem = await assertCategoryUsable(
      parsed.data.categoryId,
      parsed.data.kind,
    );
    if (categoryProblem) return categoryProblem;

    const updated = await db
      .update(products)
      .set({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        priceFils,
        categoryId: parsed.data.categoryId,
        emoji: parsed.data.emoji ?? null,
        tags: splitTags(parsed.data.tags),
        nutrition: parsed.data.nutrition ?? null,
        sizeOptions: parseSizeOptions(parsed.data.sizes ?? ""),
        colorOptions: parseColorOptions(parsed.data.colors ?? ""),
        sortOrder: parsed.data.sortOrder,
        inStock: parsed.data.inStock,
        active: parsed.data.active,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id.data))
      .returning({ id: products.id });

    if (updated.length === 0) {
      return { ok: false, error: "That product no longer exists." };
    }

    /**
     * The image list is replaced wholesale rather than diffed. The form owns
     * the full ordering, and product_images has no other referents, so a
     * delete-then-insert is both simpler and free of the reorder edge cases a
     * diff would need to handle.
     *
     * neon-http has no interactive transactions, so these go through batch()
     * to run as one server-side transaction — otherwise a failure between the
     * two statements would leave the product with no images at all.
     */
    const deleteExisting = db
      .delete(productImages)
      .where(eq(productImages.productId, id.data));

    if (parsed.data.images.length > 0) {
      await db.batch([
        deleteExisting,
        db.insert(productImages).values(
          parsed.data.images.map((image, index) => ({
            productId: id.data,
            path: image.path,
            alt: image.alt ?? null,
            sortOrder: index,
          })),
        ),
      ]);
    } else {
      await deleteExisting;
    }

    revalidateCatalog(id.data);
    return { ok: true, message: `"${parsed.data.name}" saved.` };
  } catch (error) {
    return fromUnknownError(error, "Could not save the product.");
  }
}

export async function deleteProductsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const ids = z
      .array(z.uuid())
      .min(1)
      .max(200)
      .safeParse(formData.getAll("id").map(String));

    if (!ids.success) return { ok: false, error: "Nothing selected." };

    /**
     * order_items.productId is ON DELETE SET NULL and the line already carries
     * a snapshot of the name and price, so deleting a product cannot corrupt
     * the history of what someone was charged.
     */
    const deleted = await db
      .delete(products)
      .where(inArray(products.id, ids.data))
      .returning({ id: products.id });

    revalidateCatalog();
    return {
      ok: true,
      message: `Deleted ${deleted.length} product${deleted.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return fromUnknownError(error, "Could not delete the selection.");
  }
}

/** Quick toggles from the table, without opening the editor. */
export async function setProductFlagAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = z
      .object({
        id: z.uuid(),
        field: z.enum(["active", "inStock"]),
        value: z.enum(["true", "false"]),
      })
      .safeParse({
        id: formData.get("id"),
        field: formData.get("field"),
        value: formData.get("value"),
      });

    if (!parsed.success) return { ok: false, error: "Unknown product." };

    const value = parsed.data.value === "true";

    const updated = await db
      .update(products)
      .set({ [parsed.data.field]: value, updatedAt: new Date() })
      .where(eq(products.id, parsed.data.id))
      .returning({ name: products.name });

    if (updated.length === 0) {
      return { ok: false, error: "That product no longer exists." };
    }

    revalidateCatalog(parsed.data.id);

    const label =
      parsed.data.field === "active"
        ? value
          ? "published"
          : "hidden"
        : value
          ? "back in stock"
          : "marked out of stock";

    return { ok: true, message: `"${updated[0].name}" ${label}.` };
  } catch (error) {
    return fromUnknownError(error, "Could not update the product.");
  }
}
