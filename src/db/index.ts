import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/env";

/**
 * Neon's HTTP driver: one round trip per query, no connection pool to exhaust
 * across serverless invocations. Migrations and any transaction-heavy path use
 * a pooled TCP connection via `pg` instead — see drizzle.config.ts.
 *
 * The schema is attached in Phase 1, which enables the relational query API.
 */
export const db = drizzle({ client: neon(env.DATABASE_URL) });
