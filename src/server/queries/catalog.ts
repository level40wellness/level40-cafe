import "server-only";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, mealPlans, products } from "@/db/schema";

/**
 * Read side of the data-access layer.
 *
 * Supabase enforced "Anyone can view active products" as a row-level security
 * policy. Off Supabase there is no such backstop, so the `active = true` filter
 * lives here instead — which is exactly why catalog reads must not be done ad
 * hoc from route files. Admin reads that need inactive rows get their own
 * functions behind requireAdmin() in Phase 4.
 */

export interface ProductSummary {
  id: string;
  name: string;
  description: string | null;
  priceFils: number;
  tags: string[];
  emoji: string | null;
  inStock: boolean;
  imagePath: string | null;
  categoryName: string | null;
  categorySlug: string | null;
}

export interface CategoryWithProducts {
  id: string;
  name: string;
  slug: string;
  products: ProductSummary[];
}

type ProductRow = typeof products.$inferSelect & {
  images: { path: string; sortOrder: number }[];
  category: { name: string; slug: string } | null;
};

function toSummary(row: ProductRow): ProductSummary {
  const image = [...row.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceFils: row.priceFils,
    tags: row.tags,
    emoji: row.emoji,
    inStock: row.inStock,
    imagePath: image?.path ?? null,
    categoryName: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
  };
}

async function getProductsByKind(kind: "cafe" | "retail") {
  const rows = await db.query.products.findMany({
    where: eq(products.active, true),
    orderBy: [asc(products.sortOrder), asc(products.name)],
    with: {
      images: { columns: { path: true, sortOrder: true } },
      category: { columns: { name: true, slug: true, kind: true, active: true } },
    },
  });

  return rows.filter(
    (row) => row.category?.kind === kind && row.category.active,
  ) as ProductRow[];
}

/** Café menu, grouped the way the page renders it. */
export async function getMenu(): Promise<CategoryWithProducts[]> {
  const [cafeCategories, cafeProducts] = await Promise.all([
    db.query.categories.findMany({
      where: eq(categories.kind, "cafe"),
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
    }),
    getProductsByKind("cafe"),
  ]);

  return cafeCategories
    .filter((category) => category.active)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      products: cafeProducts
        .filter((product) => product.categoryId === category.id)
        .map(toSummary),
    }))
    .filter((category) => category.products.length > 0);
}

/** Flat retail listing; the shop page does its own client-side filtering. */
export async function getShopProducts(): Promise<ProductSummary[]> {
  const rows = await getProductsByKind("retail");
  return rows.map(toSummary);
}

export async function getShopCategories() {
  const rows = await db.query.categories.findMany({
    where: eq(categories.kind, "retail"),
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
  });

  return rows
    .filter((category) => category.active)
    .map((category) => ({ id: category.id, name: category.name, slug: category.slug }));
}

/**
 * Returns null rather than throwing for a missing or inactive product, so
 * callers can render notFound(). An inactive product must 404 for the public,
 * not merely render empty.
 *
 * `kind` scopes the lookup to one side of the catalog. /shop/[id] passes
 * "retail" so a café dish does not resolve to a shop product page complete
 * with delivery and exchange terms that make no sense for a plate of food.
 */
export async function getProductById(
  id: string,
  kind?: "cafe" | "retail",
): Promise<ProductSummary | null> {
  const row = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      images: { columns: { path: true, sortOrder: true } },
      category: { columns: { name: true, slug: true, kind: true, active: true } },
    },
  });

  if (!row || !row.active) return null;
  if (!row.category?.active) return null;
  if (kind && row.category.kind !== kind) return null;

  return toSummary(row as ProductRow);
}

/** Ids only, for generating the sitemap and static params. */
export async function getActiveProductIds(kind?: "cafe" | "retail") {
  if (!kind) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.active, true));

    return rows.map((row) => row.id);
  }

  const rows = await getProductsByKind(kind);
  return rows.map((row) => row.id);
}

export interface MealPlanSummary {
  id: string;
  name: string;
  description: string | null;
  priceFils: number;
  mealsPerWeek: number;
  durationWeeks: number;
  features: string[];
}

export async function getMealPlans(): Promise<MealPlanSummary[]> {
  const rows = await db
    .select({
      id: mealPlans.id,
      name: mealPlans.name,
      description: mealPlans.description,
      priceFils: mealPlans.priceFils,
      mealsPerWeek: mealPlans.mealsPerWeek,
      durationWeeks: mealPlans.durationWeeks,
      features: mealPlans.features,
    })
    .from(mealPlans)
    .where(eq(mealPlans.active, true))
    // Ordering happens in SQL, so sortOrder need not be selected.
    .orderBy(asc(mealPlans.sortOrder), asc(mealPlans.name));

  return rows;
}
