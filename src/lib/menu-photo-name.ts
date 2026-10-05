/**
 * The photo file-name contract for the café menu importer:
 *
 *   Name:Description-Price(nutrition, comma, separated).png
 *   Basement:sautéed mushroom-19(1,2,3).jpg   → "Basement", "sautéed mushroom", 19, "1, 2, 3"
 *   Americano-16.png                          → name and price only
 *
 * Pure and dependency-free: the browser uses it to build the preview and the
 * server action runs the same limits again, because a request can be forged.
 */

export const MAX_NAME = 120;
export const MAX_DESCRIPTION = 2000;
export const MAX_NUTRITION = 300;
/** AED; stored as fils in an int column, so this is far below any overflow. */
export const MAX_PRICE_AED = 99999.99;

const IMAGE_EXT = /\.(png|jpe?g|webp|avif)$/i;

/**
 * Windows forbids ":" in file names, and this admin works on Windows, so the
 * Name/Description divider also accepts the full-width "：" (which Windows
 * allows and looks identical) and ";".
 */
const NAME_DIVIDER = /[:：;]/;

/**
 * Price sits at the END, after the last hyphen — descriptions often contain
 * hyphens ("gluten-free toast"), so scanning from the front would cut them.
 * Optional AED marker, optional decimals, optional "(nutrition)" tail.
 */
const PRICE_TAIL =
  /-\s*(?:aed\s*)?(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:aed)?\s*(?:\(([^]*)\))?\s*$/i;

/** Browsers append " (1)" when a download already exists; it is not nutrition. */
const DUPLICATE_SUFFIX = /\s+\(\d{1,2}\)$/;

export interface ParsedMenuPhotoName {
  name: string;
  description: string;
  /** Null when the file name carries no usable price. */
  priceAed: number | null;
  nutrition: string;
  /** Problems the admin should see; the row can still be fixed by hand. */
  warnings: string[];
}

/** Collapses whitespace and strips control characters; NFC so "é" typed on macOS (NFD) equals Windows "é". */
export function cleanText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The storefront (menu-browser.tsx) turns a nutrition string into pills by
 * splitting on any of these, so the importer splits on the same set — whatever
 * the file name used, what gets stored is plain comma-separated text.
 */
const NUTRITION_SPLIT = /[,|;•]/;

/** The facts exactly as the menu card will show them, one pill each. */
export function splitNutrition(value: string): string[] {
  return value
    .normalize("NFC")
    .split(NUTRITION_SPLIT)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

/** "1,2,3" or "1 | 2 • 3" → "1, 2, 3": the comma-separated form every other menu item is stored in. */
export function normaliseNutrition(value: string): string {
  return splitNutrition(value).join(", ");
}

export function parseMenuPhotoName(fileName: string): ParsedMenuPhotoName {
  const warnings: string[] = [];
  let stem = cleanText(fileName.replace(IMAGE_EXT, ""));

  // Drop a browser copy marker only when what precedes it is itself a full
  // name-and-price, so a real "(350)" nutrition tail is never mistaken for one.
  if (DUPLICATE_SUFFIX.test(stem) && PRICE_TAIL.test(stem.replace(DUPLICATE_SUFFIX, ""))) {
    stem = stem.replace(DUPLICATE_SUFFIX, "");
  }
  const tail = stem.match(PRICE_TAIL);

  let head = stem;
  let priceAed: number | null = null;
  let nutrition = "";

  if (tail && tail.index !== undefined) {
    head = stem.slice(0, tail.index).trim();
    const price = Number.parseFloat(tail[1].replace(",", "."));
    if (Number.isFinite(price) && price > 0 && price <= MAX_PRICE_AED) {
      priceAed = price;
    } else {
      warnings.push("The price in the file name is out of range.");
    }
    nutrition = normaliseNutrition(tail[2] ?? "");
  } else {
    warnings.push("No price found in the file name — set one below.");
  }

  const divider = head.search(NAME_DIVIDER);
  const name = cleanText(divider === -1 ? head : head.slice(0, divider));
  const description = cleanText(divider === -1 ? "" : head.slice(divider + 1));

  if (!name) warnings.push("No item name found in the file name.");

  return { name, description, priceAed, nutrition, warnings };
}

/** Lower-cased and de-spaced, so "Cold  Brew" and "cold brew" are one item. */
export function nameKey(name: string): string {
  return cleanText(name).toLowerCase();
}

export interface RowIssues {
  errors: string[];
  warnings: string[];
}

/** The one place the limits live, applied to a (possibly hand-edited) row. */
export function validateRow(row: {
  name: string;
  description: string;
  nutrition: string;
  priceAed: number | null;
}): RowIssues {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!cleanText(row.name)) errors.push("Name is required.");
  if (cleanText(row.name).length > MAX_NAME) errors.push(`Name is over ${MAX_NAME} characters.`);
  if (row.description.length > MAX_DESCRIPTION) errors.push(`Description is over ${MAX_DESCRIPTION} characters.`);
  if (row.nutrition.length > MAX_NUTRITION) errors.push(`Nutrition is over ${MAX_NUTRITION} characters.`);
  if (row.priceAed !== null && (!(row.priceAed > 0) || row.priceAed > MAX_PRICE_AED)) {
    errors.push(`Price must be between 0.01 and ${MAX_PRICE_AED}.`);
  }
  if (row.priceAed === null) warnings.push("No price — a new item will be hidden until you set one.");

  return { errors, warnings };
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/** `file.type` is empty for some browsers/OS pairs, so fall back to the extension. */
export function isAcceptedImage(file: { name: string; type: string }): boolean {
  if (file.type) return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
  return IMAGE_EXT.test(file.name);
}
