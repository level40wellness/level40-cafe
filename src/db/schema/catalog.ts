import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/** Was a CHECK constraint on `categories.kind`; an enum states the intent better. */
export const categoryKind = pgEnum("category_kind", ["cafe", "retail", "both"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull(),
    kind: categoryKind().default("both").notNull(),
    sortOrder: integer().default(0).notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("categories_slug_kind_uniq").on(sql`lower(${table.slug})`, table.kind),
  ],
);

/**
 * One catalog for both the café menu and the retail shop, discriminated by
 * `categories.kind`. The source app kept 17 menu items in a static TypeScript
 * file, which meant a redeploy to change a price.
 *
 * The original `lower(name)` unique index is deliberately not ported — it made
 * variants of one item (two sizes of a drink) impossible.
 */
export const products = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    description: text(),
    priceFils: integer().default(0).notNull(),
    categoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    // Menu-specific presentation, previously only in the static file.
    tags: text().array().default([]).notNull(),
    emoji: text(),
    inStock: boolean().default(true).notNull(),
    sortOrder: integer().default(0).notNull(),
    active: boolean().default(true).notNull(),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("products_category_id_idx").on(table.categoryId)],
);

/**
 * Replaces `products.image_urls text[]`, which stored ten-year signed URLs
 * directly in the row — those break permanently when storage keys rotate.
 * This stores the object path; the URL is built at render time.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    path: text().notNull(),
    alt: text(),
    sortOrder: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("product_images_product_id_idx").on(table.productId)],
);

export const mealPlans = pgTable("meal_plans", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text(),
  priceFils: integer().default(0).notNull(),
  mealsPerWeek: integer().default(5).notNull(),
  durationWeeks: integer().default(1).notNull(),
  imageUrl: text(),
  features: jsonb().$type<string[]>().default([]).notNull(),
  active: boolean().default(true).notNull(),
  sortOrder: integer().default(0).notNull(),
  createdBy: text().references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));
