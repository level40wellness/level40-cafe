import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Neon's HTTP driver: one round trip per query, no connection pool to exhaust
 * across serverless invocations. Migrations and any transaction-heavy path use
 * a pooled TCP connection via `pg` instead — see drizzle.config.ts.
 *
 * `casing` must stay in lockstep with drizzle.config.ts. Drizzle derives column
 * names from the property names, so a mismatch produces runtime queries that
 * reference columns the generated migration never created.
 */
export const db = drizzle({
  client: neon(env.DATABASE_URL),
  schema,
  casing: "snake_case",
});

export { schema };
