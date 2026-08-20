import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Journal posts written in the admin console. The homepage shows the two most
 * recent live posts; /blog lists them all. `images` stores blob URLs like the
 * team portraits — the first entry is the cover.
 */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    /** URL segment under /blog — derived from the title when left blank. */
    slug: text().notNull(),
    /** One or two sentences shown on the cards. */
    excerpt: text().notNull(),
    /** Full body; paragraphs separated by blank lines. */
    content: text(),
    images: text().array().default([]).notNull(),
    /** Stored lowercase without the leading "#". */
    hashtags: text().array().default([]).notNull(),
    author: text(),
    publishedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("blog_posts_slug_uniq").on(sql`lower(${table.slug})`)],
);
