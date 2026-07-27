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
import { customers } from "./schema/customer";
import { CUSTOMER_SEED } from "./customer-seed";

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

/**
 * The retail side is a tree (see the NeatByNikki category screenshots), so
 * entries carry an optional `parent` slug. They are listed parents-first, which
 * lets the seeder resolve a parent id from earlier rows in a single pass.
 *
 * Slugs match what slugify() produces from the name, so the CSV importer
 * resolves the same category rather than creating a duplicate: "TPE Yoga Mat"
 * and the sheet's "TPE YOGA MAT" both slug to "tpe-yoga-mat".
 */
type CategorySeed = {
  name: string;
  slug: string;
  kind: "cafe" | "retail" | "both";
  sortOrder: number;
  parent?: string;
};

const CATEGORY_SEED: CategorySeed[] = [
  // Café menu — flat.
  { name: "Signatures", slug: "signatures", kind: "cafe", sortOrder: 10 },
  { name: "Mezze", slug: "mezze", kind: "cafe", sortOrder: 20 },
  { name: "Desserts", slug: "desserts", kind: "cafe", sortOrder: 40 },
  { name: "Beverages", slug: "beverages", kind: "cafe", sortOrder: 50 },

  // Retail — top level.
  { name: "Mats", slug: "mats", kind: "retail", sortOrder: 10 },
  { name: "Accessories", slug: "accessories", kind: "retail", sortOrder: 20 },
  { name: "Activewear", slug: "activewear", kind: "retail", sortOrder: 30 },
  { name: "Menu", slug: "menu", kind: "cafe", sortOrder: 60 },

  // Accessories → mid level.
  {
    name: "Bags & Carriers",
    slug: "bags-carriers",
    kind: "retail",
    parent: "accessories",
    sortOrder: 10,
  },
  {
    name: "Props",
    slug: "props",
    kind: "retail",
    parent: "accessories",
    sortOrder: 20,
  },
  // Accessories → leaves.
  {
    name: "Mat Carrier",
    slug: "mat-carrier",
    kind: "retail",
    parent: "bags-carriers",
    sortOrder: 10,
  },
  {
    name: "Yoga Bags",
    slug: "yoga-bags",
    kind: "retail",
    parent: "bags-carriers",
    sortOrder: 20,
  },
  {
    name: "Strap",
    slug: "strap",
    kind: "retail",
    parent: "props",
    sortOrder: 10,
  },
  {
    name: "Yoga Blocks",
    slug: "yoga-blocks",
    kind: "retail",
    parent: "props",
    sortOrder: 20,
  },

  // Activewear → leaves.
  {
    name: "Leggings",
    slug: "leggings",
    kind: "retail",
    parent: "activewear",
    sortOrder: 10,
  },
  {
    name: "Sets",
    slug: "sets",
    kind: "retail",
    parent: "activewear",
    sortOrder: 20,
  },
  {
    name: "Shorts",
    slug: "shorts",
    kind: "retail",
    parent: "activewear",
    sortOrder: 30,
  },
  {
    name: "Sports Bra",
    slug: "sports-bra",
    kind: "retail",
    parent: "activewear",
    sortOrder: 40,
  },

  // Mats → leaves.
  {
    name: "Meditation Yoga Mat",
    slug: "meditation-yoga-mat",
    kind: "retail",
    parent: "mats",
    sortOrder: 10,
  },
  {
    name: "Balanced Mats",
    slug: "balanced-mats",
    kind: "retail",
    parent: "mats",
    sortOrder: 20,
  },
  {
    name: "TPE Yoga Mat",
    slug: "tpe-yoga-mat",
    kind: "retail",
    parent: "mats",
    sortOrder: 30,
  },
  {
    name: "Jute Mats",
    slug: "jute-mats",
    kind: "retail",
    parent: "mats",
    sortOrder: 40,
  },
  {
    name: "Cork Mats",
    slug: "cork-mats",
    kind: "retail",
    parent: "mats",
    sortOrder: 50,
  },
  {
    name: "Travel Mats",
    slug: "travel-mats",
    kind: "retail",
    parent: "mats",
    sortOrder: 60,
  },
  {
    name: "Suede Chunky Mats",
    slug: "suede-chunky-mats",
    kind: "retail",
    parent: "mats",
    sortOrder: 70,
  },
  {
    name: "Premium Mats",
    slug: "premium-mats",
    kind: "retail",
    parent: "mats",
    sortOrder: 80,
  },

  // Menu items.
  {
    name: "Breakfast",
    slug: "breakfast",
    kind: "cafe",
    parent: "menu",
    sortOrder: 10,
  },
  { name: "Mains", slug: "mains", kind: "cafe", parent: "menu", sortOrder: 20 },
  {
    name: "Salads & Soups",
    slug: "salads-soups",
    kind: "cafe",
    parent: "menu",
    sortOrder: 30,
  },
  {
    name: "Signature Smoothies",
    slug: "signature-smoothies",
    kind: "cafe",
    parent: "menu",
    sortOrder: 40,
  },
  {
    name: "Cold Pressed Juices",
    slug: "cold-pressed-juices",
    kind: "cafe",
    parent: "menu",
    sortOrder: 50,
  },
  {
    name: "Premium Signature Juices",
    slug: "premium-signature-juices",
    kind: "cafe",
    parent: "menu",
    sortOrder: 60,
  },
  {
    name: "Wellness Shots",
    slug: "wellness-shots",
    kind: "cafe",
    parent: "menu",
    sortOrder: 70,
  },
  {
    name: "Pre-Workout Elixirs",
    slug: "pre-workout-elixirs",
    kind: "cafe",
    parent: "menu",
    sortOrder: 80,
  },
  {
    name: "Post-Workout Recovery",
    slug: "post-workout-recovery",
    kind: "cafe",
    parent: "menu",
    sortOrder: 90,
  },
  {
    name: "Speciality Coffee",
    slug: "speciality-coffee",
    kind: "cafe",
    parent: "menu",
    sortOrder: 100,
  },
  {
    name: "Iced Coffee",
    slug: "iced-coffee",
    kind: "cafe",
    parent: "menu",
    sortOrder: 110,
  },
  {
    name: "Functional Wellness Lattes",
    slug: "functional-wellness-lattes",
    kind: "cafe",
    parent: "menu",
    sortOrder: 120,
  },
];

/** The 17 items from the source app's menu-data.ts. */
const MENU_SEED = [
  {
    id: "sig-1",
    name: "Saffron Lamb Skewers",
    description:
      "Charcoal-grilled lamb, saffron-pomegranate rice, mint yoghurt.",
    price: 88,
    slug: "signatures",
    tags: ["Chef's pick", "Spicy"],
    emoji: "🍖",
  },
  {
    id: "sig-2",
    name: "Royal Mandi",
    description:
      "Slow-cooked lamb shank over fragrant mandi rice, golden raisins.",
    price: 95,
    slug: "signatures",
    tags: ["Chef's pick"],
    emoji: "🍛",
  },
  {
    id: "sig-3",
    name: "Truffle Shakshuka",
    description:
      "Slow-braised tomato, free-range eggs, black truffle, toasted khubz.",
    price: 62,
    slug: "signatures",
    tags: ["Vegetarian"],
    emoji: "🍳",
  },
  {
    id: "mez-1",
    name: "House Hummus",
    description: "Whipped chickpea, tahini, smoked olive oil, warm pita.",
    price: 32,
    slug: "mezze",
    tags: ["Vegan"],
    emoji: "🥣",
  },
  {
    id: "mez-2",
    name: "Muhammara",
    description: "Roasted red pepper, walnut, pomegranate molasses.",
    price: 34,
    slug: "mezze",
    tags: ["Vegan"],
    emoji: "🌶️",
  },
  {
    id: "mez-3",
    name: "Halloumi & Date",
    description: "Pan-seared halloumi, sticky dates, orange-blossom honey.",
    price: 42,
    slug: "mezze",
    tags: ["Vegetarian"],
    emoji: "🧀",
  },
  {
    id: "mez-4",
    name: "Fattoush Royale",
    description: "Crisp greens, sumac, pomegranate, toasted khubz crumble.",
    price: 38,
    slug: "mezze",
    tags: ["Vegan"],
    emoji: "🥗",
  },
  {
    id: "main-1",
    name: "Wagyu Kofta",
    description: "Spiced wagyu kofta, charred onion, tahini cream, flatbread.",
    price: 96,
    slug: "mains",
    tags: ["Premium"],
    emoji: "🥩",
  },
  {
    id: "main-2",
    name: "Seabass Harra",
    description: "Whole roasted seabass, chilli-coriander harra sauce.",
    price: 110,
    slug: "mains",
    tags: [],
    emoji: "🐟",
  },
  {
    id: "main-3",
    name: "Chicken Mussakhan",
    description: "Sumac-roasted chicken, caramelised onion, taboon bread.",
    price: 76,
    slug: "mains",
    tags: [],
    emoji: "🍗",
  },
  {
    id: "des-1",
    name: "Kunafa Royale",
    description: "Crisp pastry, melted cheese, pistachio, rose syrup.",
    price: 36,
    slug: "desserts",
    tags: ["Vegetarian"],
    emoji: "🍮",
  },
  {
    id: "des-2",
    name: "Date & Tahini Tart",
    description: "Medjool date caramel, dark tahini, brown butter crust.",
    price: 32,
    slug: "desserts",
    tags: [],
    emoji: "🥧",
  },
  {
    id: "des-3",
    name: "Rose Cardamom Crème",
    description: "Silken cardamom custard, rose petals, candied pistachio.",
    price: 30,
    slug: "desserts",
    tags: [],
    emoji: "🌹",
  },
  {
    id: "bev-1",
    name: "Arabic Coffee",
    description: "Cardamom-spiced gahwa, served with dates.",
    price: 18,
    slug: "beverages",
    tags: [],
    emoji: "☕",
  },
  {
    id: "bev-2",
    name: "Saffron Karak",
    description: "Strong black tea, saffron, condensed milk.",
    price: 16,
    slug: "beverages",
    tags: [],
    emoji: "🍵",
  },
  {
    id: "bev-3",
    name: "Rose Lemonade",
    description: "Fresh lemon, rose water, hibiscus, mint.",
    price: 22,
    slug: "beverages",
    tags: [],
    emoji: "🥤",
  },
  {
    id: "bev-4",
    name: "Pomegranate Fizz",
    description: "Pomegranate, lime, sparkling, fresh thyme.",
    price: 24,
    slug: "beverages",
    tags: [],
    emoji: "🍹",
  },
] as const;

/**
 * The retail catalogue is no longer seeded from a static array. It is loaded
 * through the CSV importer at /admin/shop (source of truth:
 * public/admin/neatbynicky-products.csv), which also carries the Size/Colour
 * options and image URLs a flat seed row could not express. A fresh database
 * therefore starts with the retail *categories* but an empty shop until the
 * sheet is imported.
 */

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
  const bySlug = new Map<string, string>();

  // Re-runnable: anything already present is kept, so existing ids are reused
  // and a second run adds only what is new.
  const existing = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  for (const row of existing) bySlug.set(row.slug, row.id);

  for (const category of CATEGORY_SEED) {
    const parentId = category.parent
      ? (bySlug.get(category.parent) ?? null)
      : null;

    if (bySlug.has(category.slug)) {
      // If the category already exists, update its parentId and sortOrder in case they changed
      await db
        .update(categories)
        .set({ parentId, sortOrder: category.sortOrder })
        .where(eq(categories.id, bySlug.get(category.slug)!));
      continue;
    }

    // Explicit type: the categories.parentId self-reference makes Drizzle's
    // inferred returning type recurse, which TS collapses to a circular any.
    const inserted: { id: string }[] = await db
      .insert(categories)
      .values({
        name: category.name,
        slug: category.slug,
        kind: category.kind,
        parentId,
        sortOrder: category.sortOrder,
      })
      .returning({ id: categories.id });

    bySlug.set(category.slug, inserted[0].id);
  }

  return bySlug;
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
  console.log(
    "  Sign in and change it. It is not stored anywhere in plain text.",
  );
  console.log("");
}

async function seedCustomers() {
  await db
    .insert(customers)
    .values(
      CUSTOMER_SEED.map((customer) => ({
        name: customer.name,
        username: customer.username,
        email: customer.email,
        country: customer.country,
        city: customer.city,
        state: customer.state,
        postcode: customer.postcode,
        dateRegistered: customer.dateRegistered,
        lastActive: customer.lastActive,
        lastOrder: customer.lastOrder,
        ordersCount: customer.ordersCount,
        totalSpend: customer.totalSpend,
        averageOrderValue: customer.averageOrderValue,
      })),
    )
    .onConflictDoNothing();
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
    // Café menu only. The retail shop is loaded via the CSV importer at
    // /admin/shop — see public/admin/neatbynicky-products.csv.
    await seedCatalog(categoryIds, MENU_SEED, "menu");
    console.log(
      `products   : ${MENU_SEED.length} (café menu; import retail via /admin/shop)`,
    );
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
  await seedCustomers();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
