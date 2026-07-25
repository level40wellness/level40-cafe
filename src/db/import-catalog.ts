import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";
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
 * One-off loader for the real NeatByNikky retail catalogue.
 *
 * Deletes the existing retail products (the café menu is left untouched) and
 * loads public/admin/neatbynicky-products.csv in their place. It reuses the
 * exact parsers the admin CSV importer uses, so what this script loads and what
 * an admin would get by uploading the same file are identical. Re-runnable: it
 * clears retail products each time, so running it twice does not duplicate.
 *
 * The admin importer at /admin/shop is the normal path; this exists so the
 * initial catalogue can be seeded without a browser session.
 */

const CSV_PATH = path.join(process.cwd(), "public", "admin", "neatbynicky-products.csv");
const MAX_IMAGES = 20;

async function main() {
  const text = readFileSync(CSV_PATH, "utf8");
  const { records } = parseCsvRecords(text);
  console.log(`rows       : ${records.length}`);

  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(inArray(categories.kind, ["retail", "both"]));
  const categoryBySlug = new Map(categoryRows.map((row) => [row.slug.toLowerCase(), row.id]));

  // Clear the current retail catalogue; product_images cascade on delete. The
  // café menu lives under cafe-kind categories and is not touched.
  const retailCategoryIds = categoryRows.map((row) => row.id);
  let deleted = 0;
  if (retailCategoryIds.length > 0) {
    const removed = await db
      .delete(products)
      .where(inArray(products.categoryId, retailCategoryIds))
      .returning({ id: products.id });
    deleted = removed.length;
  }
  console.log(`deleted    : ${deleted} existing retail products`);

  let categoriesCreated = 0;

  async function resolveCategory(pathNames: string[]): Promise<string> {
    if (pathNames.length === 0) throw new Error("Category is required.");

    let parentId: string | null = null;
    let leafId = "";

    for (const [depth, name] of pathNames.entries()) {
      const slug = slugify(name);
      if (!slug) throw new Error(`Category segment "${name}" is not usable.`);

      const existing = categoryBySlug.get(slug);
      if (existing) {
        parentId = existing;
        leafId = existing;
        continue;
      }

      // Explicit type breaks the circular inference the categories self-FK
      // otherwise triggers (see the same note in the admin importer).
      const inserted: { id: string }[] = await db
        .insert(categories)
        .values({ name, slug, kind: "retail", parentId, sortOrder: (depth + 1) * 10, active: true })
        .returning({ id: categories.id });

      categoriesCreated += 1;
      categoryBySlug.set(slug, inserted[0].id);
      parentId = inserted[0].id;
      leafId = inserted[0].id;
    }

    return leafId;
  }

  let created = 0;
  const problems: string[] = [];

  for (const record of records) {
    try {
      const get = makeGetter(record.values);

      const sku = get("SKU");
      const name = get("Name");
      if (!sku || !name) throw new Error("SKU and Name are required.");

      const priceFils = parseAedToFils(get("Price (AED)"));
      if (priceFils === null) throw new Error("Price is not a number.");

      const categoryId = await resolveCategory(parseCategoryPath(get("Category")));
      const images = splitPipes(get("Images")).slice(0, MAX_IMAGES);
      const id = randomUUID();

      const values = {
        id,
        name,
        description: get("Description") || null,
        priceFils,
        categoryId,
        sku,
        sizeOptions: parseSizeOptions(get("Sizes")),
        colorOptions: parseColorOptions(get("Colors")),
        inStock: parseBool(get("In stock"), true),
        active: parseBool(get("Published"), true),
        sortOrder: Number.parseInt(get("Sort order"), 10) || 0,
      };

      if (images.length > 0) {
        await db.batch([
          db.insert(products).values(values),
          db.insert(productImages).values(
            images.map((imagePath, index) => ({
              productId: id,
              path: imagePath,
              alt: name,
              sortOrder: index,
            })),
          ),
        ]);
      } else {
        await db.insert(products).values(values);
      }

      created += 1;
    } catch (error) {
      problems.push(`row ${record.row}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  console.log(`categories : +${categoriesCreated} created`);
  console.log(`products   : ${created} imported`);
  if (problems.length > 0) {
    console.log(`skipped    : ${problems.length}`);
    for (const problem of problems) console.log(`  - ${problem}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
