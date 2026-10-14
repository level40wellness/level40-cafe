import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isNotNull } from "drizzle-orm";
import sharp from "sharp";

import { db } from "@/db";
import { blogPosts, imageAssets, mealPlans, productImages } from "@/db/schema";

/**
 * Temporary stand-in while the Vercel Blob store is blocked (Hobby data
 * transfer limit, access resumes 2026-11-13). Copies every Blob photo the
 * public site uses into public/media as a resized WebP, served by the
 * deployment's own CDN, and writes src/lib/blob-mirror.json mapping each Blob
 * URL to its local copy. src/lib/public-image.ts applies that map on the site.
 *
 * Blob downloads are blocked too, so the bytes come from local originals:
 *  - photos the menu seed uploaded, found via image_assets.original_name in the
 *    "Level 40 - Edited Online Menu Photos" folder and new-items/;
 *  - anything dropped into image-recovery/ (any sub-folder), matched by the
 *    original file name — Blob URLs are "<original name>-<30 random chars>.ext",
 *    so "D6B78DB2-….PNG" from the phone matches its upload.
 *
 *   npm run media:mirror    re-run after adding files to image-recovery/
 */

const ROOT = process.cwd();
const PHOTO_DIRS = [
  path.join(ROOT, "Level 40 - Edited Online Menu Photos"),
  path.join(ROOT, "..", "Level 40 - Edited Online Menu Photos"),
];
const RECOVERY_DIR = path.join(ROOT, "image-recovery");
const OUT_DIR = path.join(ROOT, "public", "media");
const MANIFEST = path.join(ROOT, "src", "lib", "blob-mirror.json");
const ASSET_PREFIX = "menu-photos/";
const BLOB_HOST = ".public.blob.vercel-storage.com";

/** Lower-case file name without extension or Blob's random suffix, NFC. */
function keyOf(fileName: string, stripBlobSuffix: boolean) {
  let stem = path.parse(fileName.normalize("NFC")).name;
  if (stripBlobSuffix) stem = stem.replace(/-[A-Za-z0-9]{30}$/, "");
  return stem.trim().toLowerCase();
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** "menu-photos/../new-items/x.png" was stored relative to the in-repo photo dir. */
function fromAsset(originalName: string | undefined) {
  if (!originalName?.startsWith(ASSET_PREFIX)) return null;
  const rest = originalName.slice(ASSET_PREFIX.length);
  for (const dir of PHOTO_DIRS) {
    const file = path.join(dir, rest);
    if (existsSync(file)) return file;
  }
  return null;
}

async function main() {
  const used = new Set<string>();
  for (const row of await db.select({ path: productImages.path }).from(productImages)) used.add(row.path);
  for (const row of await db
    .select({ url: mealPlans.imageUrl })
    .from(mealPlans)
    .where(isNotNull(mealPlans.imageUrl))) used.add(row.url!);
  for (const row of await db.select({ images: blogPosts.images }).from(blogPosts))
    for (const url of row.images ?? []) used.add(url);

  const blobUrls = [...used].filter((url) => {
    try {
      return new URL(url).hostname.endsWith(BLOB_HOST);
    } catch {
      return false;
    }
  });

  const assets = new Map(
    (await db.select().from(imageAssets)).map((row) => [row.url, row.originalName]),
  );
  const recovered = new Map(walk(RECOVERY_DIR).map((file) => [keyOf(path.basename(file), false), file]));

  mkdirSync(OUT_DIR, { recursive: true });
  const manifest: Record<string, string> = {};
  const missing: string[] = [];

  for (const url of blobUrls.sort()) {
    const blobName = decodeURIComponent(new URL(url).pathname.split("/").pop()!);
    const source = fromAsset(assets.get(url)) ?? recovered.get(keyOf(blobName, true));
    if (!source) {
      missing.push(blobName.replace(/-[A-Za-z0-9]{30}(\.[^.]+)$/, "$1"));
      continue;
    }

    const slug = keyOf(blobName, true).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    const hash = createHash("sha1").update(url).digest("hex").slice(0, 8);
    const fileName = `${slug || "image"}-${hash}.webp`;
    const target = path.join(OUT_DIR, fileName);
    if (!existsSync(target)) {
      await sharp(readFileSync(source))
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(target);
    }
    manifest[url] = `/media/${fileName}`;
  }

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`mirrored : ${Object.keys(manifest).length}/${blobUrls.length} → public/media`);
  if (missing.length) {
    console.log(`\nNo local original for ${missing.length} — put these in image-recovery/ and re-run:`);
    for (const name of missing) console.log(`  ${name}`);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
