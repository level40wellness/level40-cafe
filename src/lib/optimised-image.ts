import type { CSSProperties } from "react";

/**
 * The storefront draws photos as CSS backgrounds (cards with overlays, badges
 * and gradients on top), which next/image cannot do. Pointing the background
 * at the image optimizer instead gets the same resizing and WebP encoding: a
 * 3 MB phone photo becomes a ~60 KB card, and the original is fetched from
 * Blob only when the optimizer's cache misses (see minimumCacheTTL in
 * next.config.ts). Loading originals directly cost ~80 MB per /menu visit and
 * used up the Hobby plan's 10 GB of Blob transfer.
 *
 * `width` must be one of Next's default deviceSizes/imageSizes and the quality
 * must be in images.qualities, or the optimizer answers 400.
 */
export type ImageWidth = 256 | 384 | 640 | 750 | 828 | 1080 | 1200 | 1920;

export function optimisedImage(src: string, width: ImageWidth): string {
  // data: and blob: URLs (admin previews) are not fetchable by the optimizer.
  if (/^(data|blob):/.test(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

/** `{ backgroundImage }` for a photo, or `fallback` when there is none. */
export function coverImage(
  src: string | null | undefined,
  width: ImageWidth,
  fallback?: CSSProperties,
): CSSProperties | undefined {
  return src ? { backgroundImage: `url('${optimisedImage(src, width)}')` } : fallback;
}
