import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  mealPlans,
  productImages,
  products,
  user,
  userRole,
} from "@/db/schema";
import { auth } from "@/server/auth";

/**
 * Seeds the catalog the source app kept in static TypeScript files, plus the
 * first admin.
 *
 * Re-runnable: categories rely on their unique index, products and meal plans
 * are skipped if any already exist, and the admin is skipped if the account is
 * present. It will not duplicate rows, but it also will not update existing
 * ones — edit through the admin panel, not by re-seeding.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "hello@level40wellness.com";
const ADMIN_NAME = "Level 40 Admin";

/** Source prices are whole AED; every column is minor units. */
function toFils(aed: number) {
  return Math.round(aed * 100);
}

const CATEGORY_SEED = [
  { name: "Signatures", slug: "signatures", kind: "cafe", sortOrder: 10 },
  { name: "Mezze", slug: "mezze", kind: "cafe", sortOrder: 20 },
  { name: "Mains", slug: "mains", kind: "cafe", sortOrder: 30 },
  { name: "Desserts", slug: "desserts", kind: "cafe", sortOrder: 40 },
  { name: "Beverages", slug: "beverages", kind: "cafe", sortOrder: 50 },
  { name: "Mats", slug: "mats", kind: "retail", sortOrder: 10 },
  { name: "Accessories", slug: "accessories", kind: "retail", sortOrder: 20 },
  { name: "Activewear", slug: "activewear", kind: "retail", sortOrder: 30 },
  { name: "Wellness", slug: "wellness", kind: "retail", sortOrder: 40 },
] as const;

/** The 17 items from the source app's menu-data.ts. */
const MENU_SEED = [
  { id: "sig-1", name: "Saffron Lamb Skewers", description: "Charcoal-grilled lamb, saffron-pomegranate rice, mint yoghurt.", price: 88, slug: "signatures", tags: ["Chef's pick", "Spicy"], emoji: "🍖" },
  { id: "sig-2", name: "Royal Mandi", description: "Slow-cooked lamb shank over fragrant mandi rice, golden raisins.", price: 95, slug: "signatures", tags: ["Chef's pick"], emoji: "🍛" },
  { id: "sig-3", name: "Truffle Shakshuka", description: "Slow-braised tomato, free-range eggs, black truffle, toasted khubz.", price: 62, slug: "signatures", tags: ["Vegetarian"], emoji: "🍳" },
  { id: "mez-1", name: "House Hummus", description: "Whipped chickpea, tahini, smoked olive oil, warm pita.", price: 32, slug: "mezze", tags: ["Vegan"], emoji: "🥣" },
  { id: "mez-2", name: "Muhammara", description: "Roasted red pepper, walnut, pomegranate molasses.", price: 34, slug: "mezze", tags: ["Vegan"], emoji: "🌶️" },
  { id: "mez-3", name: "Halloumi & Date", description: "Pan-seared halloumi, sticky dates, orange-blossom honey.", price: 42, slug: "mezze", tags: ["Vegetarian"], emoji: "🧀" },
  { id: "mez-4", name: "Fattoush Royale", description: "Crisp greens, sumac, pomegranate, toasted khubz crumble.", price: 38, slug: "mezze", tags: ["Vegan"], emoji: "🥗" },
  { id: "main-1", name: "Wagyu Kofta", description: "Spiced wagyu kofta, charred onion, tahini cream, flatbread.", price: 96, slug: "mains", tags: ["Premium"], emoji: "🥩" },
  { id: "main-2", name: "Seabass Harra", description: "Whole roasted seabass, chilli-coriander harra sauce.", price: 110, slug: "mains", tags: [], emoji: "🐟" },
  { id: "main-3", name: "Chicken Mussakhan", description: "Sumac-roasted chicken, caramelised onion, taboon bread.", price: 76, slug: "mains", tags: [], emoji: "🍗" },
  { id: "des-1", name: "Kunafa Royale", description: "Crisp pastry, melted cheese, pistachio, rose syrup.", price: 36, slug: "desserts", tags: ["Vegetarian"], emoji: "🍮" },
  { id: "des-2", name: "Date & Tahini Tart", description: "Medjool date caramel, dark tahini, brown butter crust.", price: 32, slug: "desserts", tags: [], emoji: "🥧" },
  { id: "des-3", name: "Rose Cardamom Crème", description: "Silken cardamom custard, rose petals, candied pistachio.", price: 30, slug: "desserts", tags: [], emoji: "🌹" },
  { id: "bev-1", name: "Arabic Coffee", description: "Cardamom-spiced gahwa, served with dates.", price: 18, slug: "beverages", tags: [], emoji: "☕" },
  { id: "bev-2", name: "Saffron Karak", description: "Strong black tea, saffron, condensed milk.", price: 16, slug: "beverages", tags: [], emoji: "🍵" },
  { id: "bev-3", name: "Rose Lemonade", description: "Fresh lemon, rose water, hibiscus, mint.", price: 22, slug: "beverages", tags: [], emoji: "🥤" },
  { id: "bev-4", name: "Pomegranate Fizz", description: "Pomegranate, lime, sparkling, fresh thyme.", price: 24, slug: "beverages", tags: [], emoji: "🍹" },
] as const;

/** The 18 retail items from the source app's SHOP array. */
const SHOP_SEED = [
  { id: "mat-balanced", name: "Balanced Mat", description: "Dual-layer alignment mat for steady standing poses.", price: 240, slug: "mats", tags: ["Bestseller"], emoji: "🧘" },
  { id: "mat-travel", name: "Travel Mat", description: "Ultra-light foldable mat — slips into any carry-on.", price: 180, slug: "mats", tags: [], emoji: "🎒" },
  { id: "mat-meditation", name: "Meditation Yoga Mat", description: "Soft, grounding mat designed for long meditation sits.", price: 220, slug: "mats", tags: [], emoji: "🕯️" },
  { id: "mat-suede", name: "Suede Chunky Mat", description: "Plush suede top, extra-thick natural rubber base.", price: 320, slug: "mats", tags: ["Premium"], emoji: "✨" },
  { id: "mat-tpe", name: "TPE Yoga Mat", description: "Eco-friendly TPE mat, lightweight with superior grip.", price: 200, slug: "mats", tags: [], emoji: "🌿" },
  { id: "mat-jute", name: "Jute Mat", description: "Natural jute weave bonded to PER for grounded practice.", price: 260, slug: "mats", tags: [], emoji: "🌾" },
  { id: "mat-cork", name: "Cork Mat", description: "Antimicrobial cork surface — better grip the more you sweat.", price: 280, slug: "mats", tags: [], emoji: "🟫" },
  { id: "mat-premium", name: "Premium Yoga Mat", description: "Studio-grade, oversized, with lifetime guarantee.", price: 380, slug: "mats", tags: ["Premium"], emoji: "💎" },
  { id: "acc-block", name: "Cork Yoga Block", description: "Pair of natural cork blocks for support and alignment.", price: 90, slug: "accessories", tags: [], emoji: "🧱" },
  { id: "acc-strap", name: "Cotton Yoga Strap", description: "2m organic cotton strap with steel D-ring buckle.", price: 60, slug: "accessories", tags: [], emoji: "🪢" },
  { id: "acc-bolster", name: "Meditation Bolster", description: "Buckwheat-filled bolster for restorative poses.", price: 180, slug: "accessories", tags: [], emoji: "🛋️" },
  { id: "acc-bag", name: "Mat Carry Bag", description: "Canvas tote with adjustable strap and side pocket.", price: 110, slug: "accessories", tags: [], emoji: "👜" },
  { id: "wear-leg", name: "High-Rise Yoga Leggings", description: "Buttery-soft, squat-proof, four-way stretch.", price: 220, slug: "activewear", tags: [], emoji: "🩱" },
  { id: "wear-bra", name: "Studio Sports Bra", description: "Medium support, seamless, breathable mesh back.", price: 160, slug: "activewear", tags: [], emoji: "👕" },
  { id: "wear-tank", name: "Flow Tank Top", description: "Light, drapey tank perfect for vinyasa flow.", price: 140, slug: "activewear", tags: [], emoji: "🎽" },
  { id: "well-tea", name: "Calming Herbal Tea", description: "Chamomile, rose, and ashwagandha blend (50g).", price: 70, slug: "wellness", tags: [], emoji: "🍵" },
  { id: "well-oil", name: "Lavender Essential Oil", description: "Pure therapeutic-grade lavender (15ml).", price: 95, slug: "wellness", tags: [], emoji: "🌸" },
  { id: "well-candle", name: "Sandalwood Candle", description: "Hand-poured soy candle, 40-hour burn.", price: 120, slug: "wellness", tags: [], emoji: "🕯️" },
] as const;

const MEAL_PLAN_SEED = [
  {
    name: "Weekly Lite",
    description: "Five chef-curated meals a week, lunch or dinner.",
    price: 349,
    mealsPerWeek: 5,
    durationWeeks: 1,
    features: ["Lunch or dinner", "Mon–Fri delivery", "Pause anytime"],
    sortOrder: 10,
  },
  {
    name: "Weekly Pro",
    description: "Ten meals a week — lunch and dinner, every weekday.",
    price: 599,
    mealsPerWeek: 10,
    durationWeeks: 1,
    features: ["Lunch + dinner", "Mon–Fri delivery", "Free dessert Friday"],
    sortOrder: 20,
  },
  {
    name: "Monthly Signature",
    description: "Twenty meals a month from the chef's tasting rotation.",
    price: 1099,
    mealsPerWeek: 5,
    durationWeeks: 4,
    features: [
      "Chef's tasting rotation",
      "Flexible delivery window",
      "10% off à la carte",
    ],
    sortOrder: 30,
  },
] as const;

async function seedCategories() {
  await db
    .insert(categories)
    .values(CATEGORY_SEED.map((category) => ({ ...category })))
    .onConflictDoNothing();

  const rows = await db
    .select({ id: categories.id, slug: categories.slug, kind: categories.kind })
    .from(categories);

  // Slugs are unique per kind, and no slug is shared across kinds here.
  return new Map(rows.map((row) => [row.slug, row.id]));
}

type CatalogEntry = {
  id: string;
  name: string;
  description: string;
  price: number;
  slug: string;
  tags: readonly string[];
  emoji: string;
};

async function seedCatalog(
  categoryIds: Map<string, string>,
  entries: readonly CatalogEntry[],
  imageFolder: "menu" | "shop",
) {
  for (const [index, entry] of entries.entries()) {
    const categoryId = categoryIds.get(entry.slug);

    if (!categoryId) {
      throw new Error(`No category seeded for slug "${entry.slug}"`);
    }

    const [inserted] = await db
      .insert(products)
      .values({
        name: entry.name,
        description: entry.description,
        priceFils: toFils(entry.price),
        categoryId,
        tags: [...entry.tags],
        emoji: entry.emoji,
        sortOrder: (index + 1) * 10,
      })
      .returning({ id: products.id });

    // A path under /public, since these ship with the repo. Admin uploads in
    // Phase 4 store a Vercel Blob path here instead; both are resolved to a URL
    // at render time rather than persisted as one.
    await db.insert(productImages).values({
      productId: inserted.id,
      path: `/images/${imageFolder}/${entry.id}.jpg`,
      alt: entry.name,
    });
  }
}

async function seedMealPlans() {
  await db.insert(mealPlans).values(
    MEAL_PLAN_SEED.map((plan) => ({
      name: plan.name,
      description: plan.description,
      priceFils: toFils(plan.price),
      mealsPerWeek: plan.mealsPerWeek,
      durationWeeks: plan.durationWeeks,
      features: [...plan.features],
      sortOrder: plan.sortOrder,
    })),
  );
}

/**
 * Replaces claim_admin(), which granted admin to whoever authenticated first.
 * The account is created through Better Auth rather than by inserting rows, so
 * the password is hashed by the same code path a real signup uses.
 */
async function seedAdmin() {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    await db
      .insert(userRole)
      .values({ userId: existing.id, role: "admin" })
      .onConflictDoNothing();

    console.log(`admin      : ${ADMIN_EMAIL} already exists, role ensured`);
    return;
  }

  const password = randomBytes(12).toString("base64url");

  await auth.api.signUpEmail({
    body: { email: ADMIN_EMAIL, password, name: ADMIN_NAME },
  });

  const [created] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1);

  if (!created) {
    throw new Error("Admin signup reported success but no user row was found");
  }

  await db.insert(userRole).values({ userId: created.id, role: "admin" });

  console.log("");
  console.log("  Admin account created. This password is shown once:");
  console.log("");
  console.log(`    email    ${ADMIN_EMAIL}`);
  console.log(`    password ${password}`);
  console.log("");
  console.log("  Sign in and change it. It is not stored anywhere in plain text.");
  console.log("");
}

async function main() {
  const categoryIds = await seedCategories();
  console.log(`categories : ${categoryIds.size}`);

  const [{ count: productCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products);

  if (productCount > 0) {
    console.log(`products   : ${productCount} already present, skipped`);
  } else {
    await seedCatalog(categoryIds, MENU_SEED, "menu");
    await seedCatalog(categoryIds, SHOP_SEED, "shop");
    console.log(`products   : ${MENU_SEED.length + SHOP_SEED.length}`);
  }

  const [{ count: planCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mealPlans);

  if (planCount > 0) {
    console.log(`meal plans : ${planCount} already present, skipped`);
  } else {
    await seedMealPlans();
    console.log(`meal plans : ${MEAL_PLAN_SEED.length}`);
  }

  await seedAdmin();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
