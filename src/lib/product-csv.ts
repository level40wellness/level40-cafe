import type { ColorOption } from "@/db/schema/catalog";
import { splitPipes } from "./csv";

/**
 * The product spreadsheet's contract. One row per product, `SKU` the key that
 * decides update-vs-insert on re-upload. Deliberately a fraction of
 * WooCommerce's ~90 columns — everything here maps to something the shop
 * actually renders.
 *
 * Both the import parser and the export/template writer read this one array, so
 * the columns can never drift apart.
 */
export const PRODUCT_CSV_COLUMNS = [
  "SKU",
  "Name",
  "Category",
  "Price (AED)",
  "Description",
  "Sizes",
  "Colors",
  "Images",
  "In stock",
  "Published",
  "Sort order",
] as const;

export const MENU_CSV_COLUMNS = [
  "SKU",
  "Item Name",
  "Category",
  "Price (AED)",
  "Description",
  "Nutrition",
  "Images",
  "In stock",
  "Published",
] as const;

/**
 * A case- and whitespace-insensitive accessor over one parsed row, so a header
 * typed "price (aed)" or " SKU " still resolves. Returns "" for a missing
 * column rather than undefined, which keeps every call site branch-free.
 */
export function makeGetter(values: Record<string, string>) {
  const normalised = new Map<string, string>();
  for (const [key, value] of Object.entries(values)) {
    normalised.set(key.trim().toLowerCase(), value);
  }
  return (column: string) => normalised.get(column.trim().toLowerCase()) ?? "";
}

/**
 * Must stay identical to the slug rule in the category action, or an import
 * would create "Jute Mats" as a second category alongside the one the admin UI
 * made. Both now import this single function.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "Mats > Jute Mats" → ["Mats", "Jute Mats"]. */
export function parseCategoryPath(cell: string): string[] {
  return cell
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** ["Mats", "Jute Mats"] → "Mats > Jute Mats". */
export function formatCategoryPath(names: readonly string[]): string {
  return names.join(" > ");
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * "Black:#000000 | Blue:#0066bf | Cream" → colour options. The `:hex` suffix is
 * optional; without a valid hex the colour still imports, it just renders as a
 * text pill instead of a swatch.
 */
export function parseColorOptions(cell: string): ColorOption[] {
  const seen = new Set<string>();
  const colors: ColorOption[] = [];

  for (const part of splitPipes(cell)) {
    const separator = part.indexOf(":");
    const name = (separator === -1 ? part : part.slice(0, separator)).trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const rawHex = separator === -1 ? "" : part.slice(separator + 1).trim();
    colors.push({ name, hex: HEX.test(rawHex) ? rawHex.toLowerCase() : null });
  }

  return colors;
}

/** Colour options → the `Colors` cell, round-tripping parseColorOptions. */
export function formatColorOptions(colors: readonly ColorOption[]): string {
  return colors
    .map((color) => (color.hex ? `${color.name}:${color.hex}` : color.name))
    .join(" | ");
}

/** Deduplicated, trimmed size list, preserving the order given. */
export function parseSizeOptions(cell: string): string[] {
  const seen = new Set<string>();
  const sizes: string[] = [];
  for (const size of splitPipes(cell)) {
    const key = size.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sizes.push(size);
  }
  return sizes;
}

const TRUE = new Set([
  "yes",
  "y",
  "true",
  "1",
  "on",
  "published",
  "visible",
  "in stock",
  "instock",
]);
const FALSE = new Set([
  "no",
  "n",
  "false",
  "0",
  "off",
  "hidden",
  "draft",
  "out",
  "out of stock",
]);

/** Lenient yes/no reading; an empty or unrecognised cell falls back. */
export function parseBool(cell: string, fallback: boolean): boolean {
  const value = cell.trim().toLowerCase();
  if (!value) return fallback;
  if (TRUE.has(value)) return true;
  if (FALSE.has(value)) return false;
  return fallback;
}

/**
 * AED string → integer fils, or null if it is not a clean amount.
 *
 * parseFloat * 100 is unsafe here: 19.99 * 100 is 1998.9999999999998 in
 * IEEE-754. Splitting on the decimal point keeps the arithmetic in integers,
 * so what the sheet says is what gets stored. Mirrors the single-product form.
 */
export function parseAedToFils(input: string): number | null {
  const trimmed = input
    .trim()
    .replace(/^AED\s*/i, "")
    .replace(/,/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(trimmed)) return null;

  const [dirhams, fils = ""] = trimmed.split(".");
  return Number(dirhams) * 100 + Number(fils.padEnd(2, "0"));
}

/** Fils → the `Price (AED)` cell: "230" when whole, "230.50" otherwise. */
export function formatFilsToAed(fils: number): string {
  return fils % 100 === 0 ? String(fils / 100) : (fils / 100).toFixed(2);
}
