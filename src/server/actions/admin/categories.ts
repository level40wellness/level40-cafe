"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { requireAdmin } from "@/server/guards";
// Slugs appear in URLs, so they are generated rather than accepted verbatim —
// a category called "Chef's / Specials" would otherwise produce a slug that
// breaks the path it is pasted into. Shared with the CSV importer so both build
// the same slug for the same name.
import { slugify } from "@/lib/product-csv";
import {
  type ActionResult,
  fromUnknownError,
  fromZodError,
} from "./result";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z.string().trim().max(80).optional(),
  kind: z.enum(["cafe", "retail", "both"]),
  parentId: z.uuid().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.coerce.boolean().default(false),
});

function parse(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    // `|| undefined` is load-bearing: formData.get returns null for a field
    // that was not submitted, and zod's .optional() accepts undefined but
    // rejects null. The rendered form always includes the input, so this only
    // bites a caller that omits it — which is exactly the case worth handling.
    slug: formData.get("slug") || undefined,
    kind: formData.get("kind"),
    // Empty string is the "no parent / top level" option in the form.
    parentId: formData.get("parentId") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
    // An unchecked checkbox submits nothing at all, so absence means false.
    active: formData.get("active") === "on",
  });
}

/**
 * A child must attach to a parent that exists and sits on the same side of the
 * catalogue (or on "both"). Returns a message to show against the field, or
 * null when the parent is usable.
 */
async function checkParent(
  parentId: string,
  kind: "cafe" | "retail" | "both",
): Promise<string | null> {
  const [parent] = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(eq(categories.id, parentId))
    .limit(1);

  if (!parent) return "That parent category no longer exists.";
  if (parent.kind !== kind && parent.kind !== "both" && kind !== "both") {
    return "The parent belongs to a different section of the catalogue.";
  }
  return null;
}

/**
 * Walks up from the proposed parent; reaching the category being edited would
 * make it a descendant of itself — which Postgres would store and the tree
 * walks elsewhere would loop on.
 */
async function wouldCycle(parentId: string, selfId: string): Promise<boolean> {
  let current: string | null = parentId;
  const seen = new Set<string>();

  while (current) {
    if (current === selfId) return true;
    if (seen.has(current)) break;
    seen.add(current);

    const rows: { parentId: string | null }[] = await db
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(eq(categories.id, current))
      .limit(1);
    current = rows[0]?.parentId ?? null;
  }

  return false;
}

/**
 * The public menu and shop are served with ISR (revalidate = 300), so without
 * this an admin's change would be invisible for up to five minutes and they
 * would reasonably conclude the save had failed.
 */
function revalidateCatalog() {
  revalidatePath("/menu");
  revalidatePath("/shop");
  revalidatePath("/admin/categories");
}

export async function createCategoryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = parse(formData);
    if (!parsed.success) return fromZodError(parsed.error);

    const { name, kind, sortOrder, active, parentId } = parsed.data;
    const slug = slugify(parsed.data.slug || name);

    if (!slug) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { name: "Name must contain at least one letter or number." },
      };
    }

    // categories_slug_kind_uniq would raise anyway; checking first turns a
    // driver error into a message next to the field that caused it.
    const clash = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(sql`lower(${categories.slug}) = ${slug}`, eq(categories.kind, kind)),
      )
      .limit(1);

    if (clash.length > 0) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { slug: `"${slug}" is already used by another ${kind} category.` },
      };
    }

    if (parentId) {
      const parentProblem = await checkParent(parentId, kind);
      if (parentProblem) {
        return {
          ok: false,
          error: "Please correct the highlighted fields.",
          fieldErrors: { parentId: parentProblem },
        };
      }
    }

    await db.insert(categories).values({ name, slug, kind, parentId: parentId ?? null, sortOrder, active });

    revalidateCatalog();
    return { ok: true, message: `Category "${name}" created.` };
  } catch (error) {
    return fromUnknownError(error, "Could not create the category.");
  }
}

export async function updateCategoryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown category." };

    const parsed = parse(formData);
    if (!parsed.success) return fromZodError(parsed.error);

    const { name, kind, sortOrder, active, parentId } = parsed.data;
    const slug = slugify(parsed.data.slug || name);

    const clash = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          sql`lower(${categories.slug}) = ${slug}`,
          eq(categories.kind, kind),
          ne(categories.id, id.data),
        ),
      )
      .limit(1);

    if (clash.length > 0) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { slug: `"${slug}" is already used by another ${kind} category.` },
      };
    }

    if (parentId) {
      const problem =
        parentId === id.data
          ? "A category cannot be its own parent."
          : ((await checkParent(parentId, kind)) ??
            ((await wouldCycle(parentId, id.data))
              ? "That would nest the category inside one of its own sub-categories."
              : null));

      if (problem) {
        return {
          ok: false,
          error: "Please correct the highlighted fields.",
          fieldErrors: { parentId: problem },
        };
      }
    }

    const updated = await db
      .update(categories)
      .set({ name, slug, kind, parentId: parentId ?? null, sortOrder, active })
      .where(eq(categories.id, id.data))
      .returning({ id: categories.id });

    if (updated.length === 0) return { ok: false, error: "Category no longer exists." };

    revalidateCatalog();
    return { ok: true, message: `Category "${name}" saved.` };
  } catch (error) {
    return fromUnknownError(error, "Could not save the category.");
  }
}

export async function deleteCategoryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown category." };

    /**
     * products.categoryId is ON DELETE SET NULL, so deleting a category does
     * not delete its products — it orphans them, and an orphaned product is
     * filtered out of both the menu and the shop because neither can place it.
     * Refusing while it still holds products makes that consequence explicit
     * instead of silently emptying a section of the public site.
     */
    const [{ inUse }] = await db
      .select({ inUse: count() })
      .from(products)
      .where(eq(products.categoryId, id.data));

    if (inUse > 0) {
      return {
        ok: false,
        error: `That category still holds ${inUse} product${inUse === 1 ? "" : "s"}. Move or delete them first.`,
      };
    }

    /**
     * Children are ON DELETE SET NULL, so deleting a parent would silently lift
     * its sub-categories to the top level. Refusing while any remain keeps the
     * tree an explicit, deliberate structure rather than one that reshapes
     * itself on a delete.
     */
    const [{ children }] = await db
      .select({ children: count() })
      .from(categories)
      .where(eq(categories.parentId, id.data));

    if (children > 0) {
      return {
        ok: false,
        error: `That category has ${children} sub-categor${children === 1 ? "y" : "ies"}. Delete or move them first.`,
      };
    }

    // Reporting on what was actually removed, rather than on the statement
    // having run. A DELETE that matches nothing succeeds, so without this an
    // already-deleted category confirms a second deletion that never happened.
    const deleted = await db
      .delete(categories)
      .where(eq(categories.id, id.data))
      .returning({ name: categories.name });

    if (deleted.length === 0) {
      return { ok: false, error: "That category no longer exists." };
    }

    revalidateCatalog();
    return { ok: true, message: `Category "${deleted[0].name}" deleted.` };
  } catch (error) {
    return fromUnknownError(error, "Could not delete the category.");
  }
}
