import mirror from "./blob-mirror.json";

/**
 * TEMPORARY — the Vercel Blob store is blocked (Hobby data transfer limit,
 * access resumes 2026-11-13), so every Blob URL returns 403 and photos render
 * as broken images. Public-site reads pass image URLs through here:
 *  - a Blob URL with a local copy (see src/db/mirror-blob-images.ts) is served
 *    from /media on the deployment instead;
 *  - one without a copy is dropped while BLOB_BLOCKED is on, so the page shows
 *    its no-photo placeholder rather than a broken image.
 * Admin reads skip this and keep the real Blob URLs, which is what gets saved.
 *
 * Once the store is back, set BLOB_BLOCKED to false. Mirrored photos can stay:
 * they are smaller, and serving them locally saves Blob transfer.
 */
const BLOB_BLOCKED = true;
const BLOB_HOST = ".public.blob.vercel-storage.com";
const MIRROR: Record<string, string> = mirror;

function isBlobUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith(BLOB_HOST);
  } catch {
    return false;
  }
}

export function publicImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (MIRROR[url]) return MIRROR[url];
  return BLOB_BLOCKED && isBlobUrl(url) ? null : url;
}

export function publicImages(urls: string[] | null | undefined): string[] {
  return (urls ?? []).map(publicImage).filter((url): url is string => url !== null);
}
