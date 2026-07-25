/**
 * A small, dependency-free CSV reader/writer.
 *
 * The project deliberately does not depend on `xlsx`/SheetJS: npm's copy is
 * frozen at 0.18.5 and the prototype-pollution (CVE-2023-30533) and ReDoS
 * (CVE-2024-22363) fixes never shipped there. CSV covers the bulk
 * import/export need, opens natively in Excel and Google Sheets, and needs no
 * third-party code to parse — so it is parsed here, by hand, following
 * RFC 4180: comma-separated, `"` quoting, `""` for a literal quote, and quoted
 * fields that may contain commas and newlines.
 */

/** Parse CSV text into a grid of raw string cells. */
export function parseCsv(input: string): string[][] {
  // Excel and WooCommerce prefix exports with a UTF-8 BOM; left in place it
  // would become part of the first header, so "ID" reads as "﻿ID".
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  function endField() {
    row.push(field);
    field = "";
  }

  function endRow() {
    endField();
    rows.push(row);
    row = [];
  }

  while (i < n) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      endField();
      i += 1;
      continue;
    }
    // Treat CRLF, lone CR and lone LF all as one row break.
    if (char === "\r") {
      endRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (char === "\n") {
      endRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Flush a final row that had no trailing newline. A file that *did* end on a
  // newline leaves field="" and row=[], which this skips rather than emitting a
  // spurious empty row.
  if (field.length > 0 || row.length > 0) endRow();

  return rows;
}

/** Quote a single cell only when it contains a comma, quote or newline. */
function encodeCell(value: string): string {
  if (value === "") return "";
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Serialise a grid back to CSV. CRLF line endings and BOM-free output are the
 * combination Excel opens without a "some data may have been lost" prompt.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(encodeCell).join(",")).join("\r\n");
}

export interface CsvRecord {
  /**
   * 1-based line number as it appears in the spreadsheet, header included, so
   * an error can say "row 7" and point at the row the editor is looking at.
   */
  row: number;
  values: Record<string, string>;
}

/**
 * Parse CSV into header-keyed records. Keys are the trimmed header cells; cell
 * values are trimmed. Fully blank lines are dropped rather than surfaced as
 * empty records, since a stray trailing line is not a product.
 */
export function parseCsvRecords(input: string): {
  headers: string[];
  records: CsvRecord[];
} {
  const grid = parseCsv(input);
  if (grid.length === 0) return { headers: [], records: [] };

  const headers = grid[0].map((cell) => cell.trim());
  const records: CsvRecord[] = [];

  for (let i = 1; i < grid.length; i += 1) {
    const raw = grid[i];
    if (raw.every((cell) => cell.trim() === "")) continue;

    const values: Record<string, string> = {};
    headers.forEach((key, index) => {
      if (key) values[key] = (raw[index] ?? "").trim();
    });

    records.push({ row: i + 1, values });
  }

  return { headers, records };
}

/**
 * Split one cell's `|`-separated list into trimmed, non-empty parts. The pipe
 * is the multi-value separator throughout the product sheet (sizes, colours,
 * image URLs) precisely because it never collides with the commas CSV uses to
 * separate columns or the `>` a category path uses.
 */
export function splitPipes(cell: string | undefined | null): string[] {
  if (!cell) return [];
  return cell
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function splitCommas(cell: string | undefined | null): string[] {
  if (!cell) return [];
  return cell
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
