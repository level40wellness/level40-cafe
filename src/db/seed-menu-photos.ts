import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { eq, inArray, sql } from "drizzle-orm";
import sharp from "sharp";

import { db } from "@/db";
import { categories, imageAssets, productImages, products } from "@/db/schema";

/**
 * One-off replacement of the café menu with the edited photo set in
 * "Level 40 - Edited Online Menu Photos". Runs against whatever DATABASE_URL
 * and BLOB_READ_WRITE_TOKEN are in .env, so it changes production without a
 * redeploy: /menu and / revalidate every 300s and pick the new rows up.
 *
 *   npm run db:seed-menu                        dry run, writes nothing
 *   npm run db:seed-menu -- --apply             replace the menu (first load only)
 *   npm run db:seed-menu -- --add-new           list the photos in new/ to add
 *   npm run db:seed-menu -- --add-new --confirm add them, touching nothing else
 *   npm run db:seed-menu -- --delete-old-images            list photos safe to remove
 *   npm run db:seed-menu -- --delete-old-images --confirm  remove them from Blob
 *
 * Photo cleanup is a separate step on purpose: the cached /menu HTML keeps
 * pointing at the old photos for up to five minutes after --apply, so they
 * must outlive that window. Every run writes a JSON backup first.
 *
 * Items whose file name carries no price are loaded at 0 and unpublished —
 * price is NOT NULL and the storefront has no "price on request" state, so an
 * admin sets the price and publishes them from /admin/menu.
 */

const PHOTO_DIR = path.join(process.cwd(), "Level 40 - Edited Online Menu Photos");
const BACKUP_DIR = path.join(process.cwd(), "backups");
const ASSET_PREFIX = "menu-photos/";
// The homepage looks this slug up for "Chef's picks"; kept so admins can use it.
const KEEP_SLUGS = new Set(["signatures"]);

type Item = { file: string; name: string; aed: number | null };
type Section = { name: string; items: Item[] };

const MENU: Section[] = [
  {
    name: "Coffee & Hot Drinks",
    items: [
      { file: "Americano-16.png", name: "Americano", aed: 16 },
      { file: "Iced Americano .png", name: "Iced Americano", aed: null },
      { file: "Cappuccino -24 .png", name: "Cappuccino", aed: 24 },
      { file: "Hot chocolate -25.png", name: "Hot Chocolate", aed: 25 },
    ],
  },
  {
    name: "Juices & Tonics",
    items: [
      { file: "Beetroot juice -29.png", name: "Beetroot Juice", aed: 29 },
      { file: "Lemon mint -29.png", name: "Lemon Mint", aed: 29 },
      { file: "Orange tonic -29.png", name: "Orange Tonic", aed: 29 },
    ],
  },
  {
    name: "Breakfast",
    items: [
      { file: "Almond joy toast -44.png", name: "Almond Joy Toast", aed: 44 },
      { file: "Chia seed pudding - 39.png", name: "Chia Seed Pudding", aed: 39 },
      { file: "Yogurt bowl - 38.png", name: "Yogurt Bowl", aed: 38 },
      { file: "Coconut pudding.png", name: "Coconut Pudding", aed: null },
      { file: "Chickpea Shakshuka -66 png.png", name: "Chickpea Shakshuka", aed: 66 },
      { file: "Korean tofu scramble bowl -69 png.png", name: "Korean Tofu Scramble Bowl", aed: 69 },
    ],
  },
  {
    name: "Soups",
    items: [
      { file: "Lentil Soup - 32.png", name: "Lentil Soup", aed: 32 },
      { file: "Longevity soup -39.png", name: "Longevity Soup", aed: 39 },
      { file: "Mushroom Soup-36.png", name: "Mushroom Soup", aed: 36 },
    ],
  },
  {
    name: "Bowls, Salads & Wraps",
    items: [
      { file: "Desi protein Buddha bowl-49.png", name: "Desi Protein Buddha Bowl", aed: 49 },
      { file: "Quinoa and kale bowl-47.png", name: "Quinoa & Kale Bowl", aed: 47 },
      { file: "Tofu quinoa bowl.png", name: "Tofu Quinoa Bowl", aed: null },
      { file: "Walnut cranberry salad -38.png", name: "Walnut Cranberry Salad", aed: 38 },
      { file: "Tofu wrap -37.png", name: "Tofu Wrap", aed: 37 },
    ],
  },
  {
    name: "Pasta",
    items: [
      { file: "arrabbiata pasta -36.png", name: "Arrabbiata Pasta", aed: 36 },
      { file: "mushroom broccoli fettuccine pasta -49.png", name: "Mushroom Broccoli Fettuccine", aed: 49 },
      { file: "Mushroom ravioli -55.png", name: "Mushroom Ravioli", aed: 55 },
      { file: "Mushroom tortellini -49.png", name: "Mushroom Tortellini", aed: 49 },
    ],
  },
];

/**
 * Later additions from the "new" sub-folder. Loaded by --add-new, which only
 * inserts: existing items, admin edits and categories are left as they are,
 * and an item whose name is already on the café menu is skipped, so a re-run
 * never duplicates.
 */
const NEW_DIR = "new";
const NEW_ITEMS: Array<Item & { section: string }> = [
  { file: "Level 40 goddess toast-59.png", name: "Level 40 Goddess Toast", aed: 59, section: "Breakfast" },
  { file: "Protein Pancake - 52.png", name: "Protein Pancake", aed: 52, section: "Breakfast" },
  { file: "Tofu Scramble- 49.png", name: "Tofu Scramble", aed: 49, section: "Breakfast" },
  { file: "Wild mushroom toast - 38.png", name: "Wild Mushroom Toast", aed: 38, section: "Breakfast" },
  { file: "Pumpkin Soup-35.png", name: "Pumpkin Soup", aed: 35, section: "Soups" },
  { file: "Level 40 wellness bowl - 44.png", name: "Level 40 Wellness Bowl", aed: 44, section: "Bowls, Salads & Wraps" },
  { file: "Paneer Burger-55.png", name: "Paneer Burger", aed: 55, section: "Burgers" },
];

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function snapshot() {
  const cafeCategories = await db.select().from(categories).where(eq(categories.kind, "cafe"));
  const cafeIds = cafeCategories.map((row) => row.id);
  const cafeProducts = cafeIds.length
    ? await db.query.products.findMany({
        where: inArray(products.categoryId, cafeIds),
        with: { images: true },
      })
    : [];
  const assets = await db.select().from(imageAssets);
  return { cafeCategories, cafeProducts, assets };
}

function backup(label: string, data: unknown) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `menu-${label}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`backup     : ${path.relative(process.cwd(), file)}`);
}

async function uploadPhoto(file: string): Promise<string> {
  const originalName = ASSET_PREFIX + file;
  const [existing] = await db
    .select({ url: imageAssets.url })
    .from(imageAssets)
    .where(eq(imageAssets.originalName, originalName))
    .limit(1);
  if (existing) return existing.url;

  const webp = await sharp(readFileSync(path.join(PHOTO_DIR, file)))
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const blob = await put(`products/menu/${slugify(path.parse(file).name)}.webp`, webp, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/webp",
  });
  await db.insert(imageAssets).values({ originalName, url: blob.url, key: blob.pathname });
  console.log(`  uploaded ${file} (${Math.round(webp.length / 1024)} KB)`);
  return blob.url;
}

async function apply() {
  const before = await snapshot();
  // The replacement already ran on production; a second run would wipe every
  // admin edit made since. Additions go through --add-new instead.
  if (before.cafeProducts.length > 0 && !process.argv.includes("--force-replace")) {
    throw new Error(
      `The café menu already has ${before.cafeProducts.length} items. --apply deletes them all; ` +
        "use --add-new to add items, or pass --force-replace if a full wipe is really intended.",
    );
  }
  backup("before-apply", before);

  // Upload first: if Blob fails, the live menu has not been touched yet.
  const urls = new Map<string, string>();
  for (const section of MENU) {
    for (const item of section.items) urls.set(item.file, await uploadPhoto(item.file));
  }

  const oldProductIds = before.cafeProducts.map((row) => row.id);
  if (oldProductIds.length) {
    // order_items.product_id is ON DELETE SET NULL and snapshots name/price,
    // and product_images cascade, so order history is unaffected.
    await db.delete(products).where(inArray(products.id, oldProductIds));
  }
  console.log(`deleted    : ${oldProductIds.length} old menu items`);

  const bySlug = new Map(before.cafeCategories.map((row) => [row.slug.toLowerCase(), row]));
  const newSlugs = new Set(MENU.map((section) => slugify(section.name)));

  for (const [index, section] of MENU.entries()) {
    const slug = slugify(section.name);
    const values = { name: section.name, parentId: null, sortOrder: (index + 1) * 10, active: true };
    const existing = bySlug.get(slug);
    const categoryId = existing
      ? (await db.update(categories).set({ ...values, updatedAt: new Date() }).where(eq(categories.id, existing.id)), existing.id)
      : (
          (await db
            .insert(categories)
            .values({ ...values, slug, kind: "cafe" })
            .returning({ id: categories.id })) as { id: string }[]
        )[0].id;

    for (const [position, item] of section.items.entries()) {
      const id = randomUUID();
      await db.batch([
        db.insert(products).values({
          id,
          name: item.name,
          priceFils: item.aed === null ? 0 : Math.round(item.aed * 100),
          categoryId,
          active: item.aed !== null,
          sortOrder: (position + 1) * 10,
        }),
        db.insert(productImages).values({ productId: id, path: urls.get(item.file)!, alt: item.name, sortOrder: 0 }),
      ]);
    }
    console.log(`category   : ${section.name} (${existing ? "reused" : "created"}, ${section.items.length} items)`);
  }

  // Old categories are empty now. Children go before parents so the
  // self-reference never has to null anything out.
  const stale = before.cafeCategories
    .filter((row) => !newSlugs.has(row.slug.toLowerCase()) && !KEEP_SLUGS.has(row.slug.toLowerCase()))
    .sort((a, b) => Number(b.parentId !== null) - Number(a.parentId !== null));
  let removed = 0;
  for (const row of stale) {
    const [{ n }] = (
      await db.execute(sql`select count(*)::int as n from products where category_id = ${row.id}`)
    ).rows as { n: number }[];
    const [{ c }] = (
      await db.execute(sql`select count(*)::int as c from categories where parent_id = ${row.id}`)
    ).rows as { c: number }[];
    if (n > 0 || c > 0) {
      console.log(`  kept category "${row.name}": still has ${n} products / ${c} children`);
      continue;
    }
    await db.delete(categories).where(eq(categories.id, row.id));
    removed += 1;
  }
  console.log(`categories : ${removed} old categories removed`);
  console.log(`\nDone. /menu shows the new items within 5 minutes. Unpublished (no price): ${MENU.flatMap((s) => s.items)
    .filter((item) => item.aed === null)
    .map((item) => item.name)
    .join(", ")}`);
}

async function addNew() {
  const { cafeCategories, cafeProducts } = await snapshot();
  for (const item of NEW_ITEMS) readFileSync(path.join(PHOTO_DIR, NEW_DIR, item.file)); // throws if missing

  const existingNames = new Set(cafeProducts.map((row) => row.name.trim().toLowerCase()));
  const bySlug = new Map(cafeCategories.map((row) => [row.slug.toLowerCase(), row]));
  const todo = NEW_ITEMS.filter((item) => !existingNames.has(item.name.toLowerCase()));
  const skipped = NEW_ITEMS.filter((item) => existingNames.has(item.name.toLowerCase()));

  for (const item of todo) {
    const category = bySlug.get(slugify(item.section));
    console.log(
      `  ${item.name.padEnd(26)} AED ${String(item.aed).padEnd(4)} → ${item.section}${category ? "" : " (new category)"}`,
    );
  }
  for (const item of skipped) console.log(`  ${item.name.padEnd(26)} already on the menu, skipped`);

  if (!CONFIRM) {
    console.log(`\nwould add ${todo.length} items. Nothing written. Re-run with --add-new --confirm.`);
    return;
  }
  if (todo.length === 0) return;

  backup("before-add-new", { cafeCategories, cafeProducts });

  const urls = new Map<string, string>();
  for (const item of todo) urls.set(item.file, await uploadPhoto(`${NEW_DIR}/${item.file}`));

  const maxCategorySort = Math.max(0, ...cafeCategories.map((row) => row.sortOrder));
  const nextSort = new Map<string, number>();

  for (const item of todo) {
    const slug = slugify(item.section);
    let category = bySlug.get(slug);
    if (!category) {
      // Appended after every existing section so the current menu order holds.
      const [created] = await db
        .insert(categories)
        .values({ name: item.section, slug, kind: "cafe", sortOrder: maxCategorySort + 10, active: true })
        .returning();
      category = created;
      bySlug.set(slug, created);
    }
    const categoryId = category.id;
    // New items go to the end of their section, after anything admin arranged.
    const sort =
      nextSort.get(categoryId) ??
      Math.max(0, ...cafeProducts.filter((row) => row.categoryId === categoryId).map((row) => row.sortOrder)) + 10;
    nextSort.set(categoryId, sort + 10);

    const id = randomUUID();
    await db.batch([
      db.insert(products).values({
        id,
        name: item.name,
        priceFils: Math.round(item.aed! * 100),
        categoryId,
        active: true,
        sortOrder: sort,
      }),
      db.insert(productImages).values({ productId: id, path: urls.get(item.file)!, alt: item.name, sortOrder: 0 }),
    ]);
  }
  console.log(`\nadded ${todo.length} items. /menu shows them within 5 minutes.`);
}

/**
 * Deletes a Blob photo only when nothing in the database or the source tree
 * still mentions its URL — the new menu, retail products, blog posts, meal
 * plans, team members and avatars are all checked.
 */
async function deleteOldImages() {
  const assets = await db.select().from(imageAssets);
  const referencedByProduct = await db.select({ path: productImages.path }).from(productImages);
  const liveProductPaths = new Set(referencedByProduct.map((row) => row.path));

  // Candidates: every tracked upload that is not one of the new menu photos,
  // plus every photo the deleted menu items pointed at (from the --apply backup,
  // since those rows are gone from the database).
  const candidates = new Set<string>(
    assets.filter((row) => !row.originalName.startsWith(ASSET_PREFIX)).map((row) => row.url),
  );
  const applyBackups = readdirSync(BACKUP_DIR).filter((f) => f.startsWith("menu-before-apply-")).sort();
  if (applyBackups.length === 0) throw new Error("No before-apply backup found; run --apply first.");
  const previous = JSON.parse(readFileSync(path.join(BACKUP_DIR, applyBackups[0]), "utf8")) as {
    cafeProducts: { images: { path: string }[] }[];
  };
  for (const product of previous.cafeProducts) for (const image of product.images) candidates.add(image.path);

  const sourceText = readSourceTree(path.join(process.cwd(), "src"));
  const referenced = async (url: string) => {
    if (liveProductPaths.has(url) || sourceText.includes(url)) return true;
    const rows = (
      await db.execute(sql`
        select 1 from blog_posts where images::text like ${"%" + url + "%"} or content like ${"%" + url + "%"}
        union all select 1 from meal_plans where image_url = ${url}
        union all select 1 from team_members where image_path = ${url}
        union all select 1 from "user" where image = ${url}
        union all select 1 from user_profile where avatar_url = ${url}
        limit 1`)
    ).rows;
    return rows.length > 0;
  };

  backup("before-image-cleanup", { assets });
  let deleted = 0;
  let kept = 0;
  for (const url of candidates) {
    if (!url.includes(".public.blob.vercel-storage.com/") || (await referenced(url))) {
      kept += 1;
      continue;
    }
    if (CONFIRM) {
      await del(url);
      await db.delete(imageAssets).where(eq(imageAssets.url, url));
    }
    deleted += 1;
  }
  console.log(`${CONFIRM ? "deleted" : "would delete"} : ${deleted} unused photos (kept ${kept} still in use)`);
  if (!CONFIRM) console.log("Nothing deleted. Re-run with --delete-old-images --confirm.");
}

function readSourceTree(dir: string): string {
  let text = "";
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) text += readSourceTree(full);
    else if (/\.(tsx?|css|json|md)$/.test(entry)) text += readFileSync(full, "utf8");
  }
  return text;
}

async function dryRun() {
  const { cafeCategories, cafeProducts, assets } = await snapshot();
  const newSlugs = new Set(MENU.map((section) => slugify(section.name)));
  for (const section of MENU) {
    for (const item of section.items) readFileSync(path.join(PHOTO_DIR, item.file)); // throws if missing
  }
  console.log(`would delete     : ${cafeProducts.length} menu items (${cafeProducts.reduce((n, p) => n + p.images.length, 0)} photo links)`);
  console.log(
    `would remove     : ${cafeCategories.filter((c) => !newSlugs.has(c.slug) && !KEEP_SLUGS.has(c.slug)).map((c) => c.name).join(", ")}`,
  );
  console.log(`would reuse      : ${cafeCategories.filter((c) => newSlugs.has(c.slug)).map((c) => c.name).join(", ") || "none"}`);
  console.log(`image_assets now : ${assets.length}\n`);
  for (const section of MENU) {
    console.log(section.name);
    for (const item of section.items) {
      console.log(`  ${item.name.padEnd(30)} ${item.aed === null ? "no price → unpublished" : `AED ${item.aed}`}`);
    }
  }
  console.log("\nNothing written. Re-run with --apply.");
}

const APPLY_IMAGES = process.argv.includes("--delete-old-images");
const CONFIRM = process.argv.includes("--confirm");

(process.argv.includes("--apply")
  ? apply()
  : process.argv.includes("--add-new")
    ? addNew()
    : APPLY_IMAGES
      ? deleteOldImages()
      : dryRun()
)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
