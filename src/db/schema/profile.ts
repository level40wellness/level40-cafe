import { relations } from "drizzle-orm";
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/** Ported from the Supabase `app_role` enum. */
export const appRole = pgEnum("app_role", ["admin", "moderator", "user"]);

/**
 * Was `public.profiles`. Split from Better Auth's `user` table so an upgrade to
 * Better Auth never collides with our own columns.
 */
export const userProfile = pgTable("user_profile", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  phone: text(),
  avatarUrl: text(),
  preferences: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

/**
 * Replaces Supabase's `user_roles` + `has_role()`. There is no `claim_admin()`
 * equivalent by design: the original granted admin to the first authenticated
 * caller. Admins are seeded explicitly instead.
 */
export const userRole = pgTable(
  "user_role",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: appRole().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("user_role_user_id_role_uniq").on(table.userId, table.role)],
);

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, { fields: [userProfile.userId], references: [user.id] }),
}));

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, { fields: [userRole.userId], references: [user.id] }),
}));
