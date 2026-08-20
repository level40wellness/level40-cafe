import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  blogPosts,
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

/**
 * The seven nutritionist-guided programmes. Prices and inclusions are
 * placeholders to be refined through the admin panel.
 */
const MEAL_PLAN_SEED = [
  {
    name: "Diabetes",
    description:
      "Low-GI, biomarker-informed meals designed to support stable blood sugar every day.",
    price: 1499,
    mealsPerWeek: 10,
    durationWeeks: 4,
    features: [
      "Low-GI chef-crafted meals",
      "Nutritionist consultation",
      "Biomarker-informed menu",
      "Weekly progress check-ins",
    ],
    sortOrder: 10,
  },
  {
    name: "Weight Management",
    description:
      "Calorie-smart, high-protein meals that keep you satisfied while you reach your goal.",
    price: 1399,
    mealsPerWeek: 10,
    durationWeeks: 4,
    features: [
      "High-protein, portion-controlled",
      "Nutritionist consultation",
      "Weekly measurements & adjustments",
      "Guided fitness plan",
    ],
    sortOrder: 20,
  },
  {
    name: "Cholesterol",
    description:
      "Heart-healthy menus low in saturated fat and rich in fibre and good fats.",
    price: 1399,
    mealsPerWeek: 10,
    durationWeeks: 4,
    features: [
      "Heart-healthy ingredients",
      "Lipid-profile aware menus",
      "Nutritionist consultation",
      "Monthly progress review",
    ],
    sortOrder: 30,
  },
  {
    name: "PCOS",
    description:
      "Hormone-friendly, anti-inflammatory meals that support PCOS management naturally.",
    price: 1499,
    mealsPerWeek: 10,
    durationWeeks: 4,
    features: [
      "Anti-inflammatory ingredients",
      "Hormone-supportive nutrition",
      "Nutritionist consultation",
      "Yoga & movement guidance",
    ],
    sortOrder: 40,
  },
  {
    name: "Thyroid",
    description:
      "Metabolism-supporting nutrition tailored to thyroid health and energy levels.",
    price: 1499,
    mealsPerWeek: 10,
    durationWeeks: 4,
    features: [
      "Metabolism-supporting meals",
      "Iodine & selenium aware menus",
      "Nutritionist consultation",
      "Weekly progress check-ins",
    ],
    sortOrder: 50,
  },
  {
    name: "Standard Meal Plan",
    description:
      "Balanced, chef-curated everyday meals for general wellness — no restrictions, just good food.",
    price: 1199,
    mealsPerWeek: 10,
    durationWeeks: 4,
    features: [
      "Chef-curated daily menus",
      "High-protein vegetarian",
      "Flexible delivery window",
      "Pause or swap anytime",
    ],
    sortOrder: 60,
  },
  {
    name: "Level 40 Integrated Meal Plan",
    description:
      "The complete journey — blood assessment, nutritionist and yoga consultations, fresh meals and a guided fitness plan.",
    price: 2499,
    mealsPerWeek: 14,
    durationWeeks: 4,
    features: [
      "Blood test assessment",
      "Nutritionist consultation",
      "Biomarker-informed fresh meals",
      "Yoga teacher consultation",
      "Guided fitness plan",
      "Measurable progress tracking",
    ],
    sortOrder: 70,
  },
] as const;

/**
 * Opening journal posts. The homepage shows the two newest live posts, so the
 * publish dates decide which pair appears there; the third lives on /blog.
 * Images reference /public so the seed works before any blob upload exists.
 */
const BLOG_SEED = [
  {
    title: "Why we built a wellness-integrated café",
    slug: "why-we-built-a-wellness-integrated-cafe",
    excerpt:
      "Wellness shouldn't live in five different apps and three different postcodes. The story of how Level 40 brought dining, nutrition, yoga and retail under one roof.",
    content:
      "When we started sketching Level 40, the brief was simple to say and hard to build: one place where a healthy life actually fits together. Most of us don't fail at wellness because we lack information — we fail because the pieces are scattered. The café is in one neighbourhood, the nutritionist in another, the yoga studio online, the meal plan in an app.\n\nSo we folded them into one destination. A kitchen that cooks high-protein vegetarian food you genuinely look forward to. Nutritionists who read your biomarkers before they write your plan. Yoga that meets you where your body is. And a retail floor curated with the same care we put on the plate.\n\nThe result is not a café with extras. It is an ecosystem — and this journal is where we'll write down what we learn running it: the recipes, the rituals, and the small decisions behind every dish.\n\nEat well. Move well. Live well. — that's the whole idea, and you're welcome to come test it in person.",
    images: ["/images/interior.jpg", "/images/chef-plating.jpg"],
    hashtags: ["level40", "wellness", "community"],
    author: "Team Level 40",
    publishedAt: new Date("2026-08-12T00:00:00Z"),
  },
  {
    title: "High-protein vegetarian eating, made simple",
    slug: "high-protein-vegetarian-eating-made-simple",
    excerpt:
      "You don't need meat to hit your protein goals — you need a plan. Our nutritionists share the plate formula behind the Level 40 menu.",
    content:
      "\"But where do you get your protein?\" is still the most common question at our counter. The honest answer: everywhere, on purpose. Lentils, chickpeas, paneer, Greek yoghurt, quinoa, tofu, nuts and seeds — the vegetarian pantry is full of protein; it just needs to be structured.\n\nOur kitchen works to a simple plate formula. Half the plate is vegetables and greens for volume and micronutrients. A quarter is a slow carbohydrate — quinoa, millet, sweet potato. The final quarter is the protein anchor, and we aim for at least 20 grams of it in every main.\n\nThe same formula drives our meal plans. When your biomarkers ask for more — after training, during weight management, or for PCOS and diabetes support — the nutritionist dials the anchor up rather than bolting on a shake.\n\nStart with one meal a day built on the formula. Consistency beats intensity, in the kitchen as much as in the gym.",
    images: ["/images/chef-plating.jpg", "/images/meal-plan-box.jpeg"],
    hashtags: ["highprotein", "vegetarian", "nutrition"],
    author: "Level 40 Nutrition Team",
    publishedAt: new Date("2026-08-18T00:00:00Z"),
  },
  {
    title: "The coffee ritual, the wellness way",
    slug: "the-coffee-ritual-the-wellness-way",
    excerpt:
      "Specialty coffee and a wellness café are not a contradiction — they're a pairing. How we source, brew and time your daily cup.",
    content:
      "Coffee is the most repeated ritual in most of our lives, which makes it the easiest place to practise intention. At Level 40 we treat the morning cup as part of the wellness day, not a loophole in it.\n\nIt starts with sourcing: beans chosen for the roast profile, roasted for sweetness rather than bitterness, so the cup needs no sugar to be enjoyable. Our baristas dial in every morning — grind, dose, temperature — because a well-extracted espresso simply asks less of the milk and the syrup bottle.\n\nThen there's timing. If you train early, we'll point you at a pre-workout espresso; if your afternoons run long, we'll suggest capping caffeine by two and switching to one of our functional beverages instead.\n\nCome by the bar and ask what's on grind this week — the answer changes, and that's the fun of it.",
    images: ["/images/menu/bev-2.jpg", "/images/menu/bev-1.jpg"],
    hashtags: ["specialtycoffee", "ritual", "barista"],
    author: "Level 40 Baristas",
    publishedAt: new Date("2026-07-30T00:00:00Z"),
  },
] as const;

async function seedBlogPosts() {
  await db.insert(blogPosts).values(
    BLOG_SEED.map((post) => ({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      images: [...post.images],
      hashtags: [...post.hashtags],
      author: post.author,
      publishedAt: post.publishedAt,
    })),
  );
}

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

  const [{ count: postCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blogPosts);

  if (postCount > 0) {
    console.log(`blog posts : ${postCount} already present, skipped`);
  } else {
    await seedBlogPosts();
    console.log(`blog posts : ${BLOG_SEED.length}`);
  }

  await seedAdmin();
  await seedCustomers();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
