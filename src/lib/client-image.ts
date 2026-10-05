/**
 * Browser-only image helpers for the menu photo importer. A phone or design
 * export is routinely 3–4 MB; the storefront shows it at a few hundred pixels,
 * so shrinking before upload cuts the transfer ~20× and keeps /menu light.
 */

/** Blob's token route caps uploads at 8 MB; mirrored here so we fail early and clearly. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const MAX_EDGE = 1200;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resizes to at most 1200px on the long edge and re-encodes as WebP (JPEG where
 * the browser cannot encode WebP). Falls back to the original file when it is
 * already smaller than the re-encoded result, or when decoding fails — so a
 * quirky file still uploads as-is rather than blocking its row, unless it is
 * over the upload cap, in which case the caller gets a readable error.
 */
export async function optimiseForUpload(file: File): Promise<Blob> {
  try {
    // Decodes honouring EXIF orientation so portrait phone photos are not rotated.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let encoded = await toBlob(canvas, "image/webp", 0.82);
    if (!encoded || encoded.type !== "image/webp") encoded = await toBlob(canvas, "image/jpeg", 0.85);
    canvas.width = canvas.height = 0; // release the pixel buffer promptly

    if (encoded && (encoded.size < file.size || file.size > MAX_UPLOAD_BYTES)) return encoded;
  } catch {
    // fall through to the original
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("This photo is over 8 MB and could not be shrunk. Export a smaller copy.");
  }
  return file;
}

/** A ~96px preview, decoded at reduced size so 100 rows never hold 100 full bitmaps. */
export async function makeThumbUrl(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: 96,
      resizeQuality: "low",
      imageOrientation: "from-image",
    });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await toBlob(canvas, "image/jpeg", 0.7);
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}
