import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * People shown in the "Meet the team" section of the homepage. Designation is
 * stored as text but validated server-side against TEAM_DESIGNATIONS — a new
 * role should be a one-line change there, not a database migration.
 */
export const teamMembers = pgTable("team_members", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  designation: text().notNull(),
  bio: text(),
  /** Blob URL of the portrait, like product images. */
  imagePath: text(),
  sortOrder: integer().default(0).notNull(),
  active: boolean().default(true).notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
