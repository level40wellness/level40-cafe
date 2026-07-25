import { asc } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { requireAdmin } from "@/server/guards";
import { toCsv } from "@/lib/csv";
import {
  PRODUCT_CSV_COLUMNS,
  formatCategoryPath,
  formatColorOptions,
  formatFilsToAed,
} from "@/lib/product-csv";

/**
 * Admin-only CSV of the retail catalogue, so the "update via spreadsheet"
 * workflow is: export → edit in Excel → re-upload through the importer, which
 * matches rows back by SKU. `?template=1` returns the same columns with one
 * example row instead of the live data.
 */
export const dynamic = "force-dynamic";

// Column order matches PRODUCT_CSV_COLUMNS exactly. Published=no keeps this
// harmless if the template is ever uploaded without deleting the example.
const EXAMPLE_ROW = [
  "NBN-EXAMPLE",
  "Example product — delete this row",
  "Mats > Jute Mats",
  "230",
  "A short description shown on the product page.",
  "S | M | L | XL",
  "Black:#000000 | Blue:#0066bf | Cream",
  "https://example.com/photo-1.jpg | https://example.com/photo-2.jpg",
  "yes",
  "no",
  "10",
];

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch (error) {
    const denied =
      error instanceof Error &&
      (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN");
    return new Response(denied ? "Not permitted." : "Export failed.", {
      status: denied ? 403 : 500,
    });
  }

  const header = [...PRODUCT_CSV_COLUMNS];
  const template = new URL(request.url).searchParams.get("template") === "1";
  const rows = template ? [header, EXAMPLE_ROW] : [header, ...(await buildRows())];

  // A leading BOM makes Excel read the UTF-8 correctly; parseCsv strips it on
  // the way back in, so the round trip is lossless.
  const body = `﻿${toCsv(rows)}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = template
    ? "neatbynicky-products-template.csv"
    : `neatbynicky-products-${stamp}.csv`;

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

async function buildRows(): Promise<string[][]> {
  const allCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories);
  const byId = new Map(allCategories.map((row) => [row.id, row]));

  function pathFor(categoryId: string | null): string {
    if (!categoryId) return "";
    const names: string[] = [];
    const seen = new Set<string>();
    let current = byId.get(categoryId);
    // The seen-guard stops a malformed cycle in parent links from looping.
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return formatCategoryPath(names);
  }

  const rows = await db.query.products.findMany({
    orderBy: [asc(products.sortOrder), asc(products.name)],
    with: {
      images: { columns: { path: true, sortOrder: true } },
      category: { columns: { kind: true } },
    },
  });

  return rows
    .filter((row) => row.category?.kind === "retail" || row.category?.kind === "both")
    .map((row) => [
      row.sku ?? "",
      row.name,
      pathFor(row.categoryId),
      formatFilsToAed(row.priceFils),
      row.description ?? "",
      row.sizeOptions.join(" | "),
      formatColorOptions(row.colorOptions),
      [...row.images]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image) => image.path)
        .join(" | "),
      row.inStock ? "yes" : "no",
      row.active ? "yes" : "no",
      String(row.sortOrder),
    ]);
}
