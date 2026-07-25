// scripts/migrate-images.ts
import { put } from "@vercel/blob";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { db } from ".";
import { imageAssets } from "./schema";
import { eq } from "drizzle-orm";

const IMAGE_DIR = "E:\\level40wellness\\images";
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function main() {
  const entries = await readdir(IMAGE_DIR);
  let uploaded = 0,
    skipped = 0,
    failed = 0;

  for (const file of entries) {
    const full = path.join(IMAGE_DIR, file);
    const ext = path.extname(file).toLowerCase();

    if (!(await stat(full)).isFile() || !MIME[ext]) continue;

    const [existing] = await db
      .select({ id: imageAssets.id })
      .from(imageAssets)
      .where(eq(imageAssets.originalName, file))
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    try {
      const buffer = await readFile(full);
      const blob = await put(`products/${file}`, buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType: MIME[ext],
      });

      await db.insert(imageAssets).values({
        originalName: file,
        url: blob.url,
        key: blob.pathname,
      });

      uploaded++;
      console.log(`✅ ${file} -> ${blob.url}`);
    } catch (err) {
      failed++;
      console.error(`❌ ${file}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(
    `\nDone. Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
