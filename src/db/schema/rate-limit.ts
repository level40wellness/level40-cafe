import { bigint, integer, pgTable, text } from "drizzle-orm/pg-core";

/**
 * Owned by Better Auth — the shape mirrors its `rateLimit` model, which stores
 * one row per (ip, path) bucket. Better Auth defaults to in-memory counters,
 * which on Vercel means every serverless instance keeps its own and a cold
 * start wipes it; that is close to no limit at all. This table is what makes
 * `storage: "database"` possible, and with it the limits actually hold across
 * instances.
 *
 * Also used by server/rate-limit.ts for server actions, which are not routed
 * through Better Auth. Those keys are namespaced ("action:…") so the two never
 * collide, and the row semantics are identical.
 *
 * `lastRequest` is epoch milliseconds from Date.now(), which overflows int4 —
 * hence bigint. Better Auth reads it back through Number(), so the JS-number
 * mode matches what it expects.
 */
export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  // Unique because both writers upsert on it: Better Auth looks rows up by key,
  // and our own limiter needs it as the ON CONFLICT target.
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});
