import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { env } from "@/env";

/**
 * Rate limiting for server actions.
 *
 * Better Auth covers everything under /api/auth. Server actions never reach it,
 * so a public mutation like createCheckout would otherwise be unmetered: one
 * script could open thousands of orders and gateway sessions.
 *
 * Shares Better Auth's rate_limit table under an "action:" key prefix rather
 * than adding a second one. Better Auth prunes rows whose lastRequest is older
 * than its global window, so keeping that window at or above the longest limit
 * here is what stops our rows being swept out from under a live bucket.
 */

export type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Resolves the caller's address, preferring the headers the platform sets over
 * the ones a client can forge.
 *
 * x-forwarded-for is a client-appendable chain, so its leftmost entry is
 * attacker-controlled and is only read as a last resort. Vercel writes
 * x-vercel-forwarded-for and x-real-ip itself.
 */
async function clientIp(): Promise<string | null> {
  const headerList = await headers();

  const trusted =
    headerList.get("x-vercel-forwarded-for") ?? headerList.get("x-real-ip");

  if (trusted?.trim()) return trusted.trim();

  const forwarded = headerList.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || null;
}

export async function consumeRateLimit({
  name,
  windowSeconds,
  max,
}: {
  /** Namespaces the bucket, so two actions never share a counter. */
  name: string;
  windowSeconds: number;
  max: number;
}): Promise<RateLimitVerdict> {
  // Matches Better Auth's own default of limiting in production only. Local
  // development has no proxy headers, so every request would land in one shared
  // bucket and a few test orders would lock the form.
  if (env.NODE_ENV !== "production") return { allowed: true };

  const ip = await clientIp();
  const key = `action:${name}:${ip ?? "unknown"}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  /**
   * One statement, because the Neon HTTP driver has no interactive
   * transactions — a read-then-write would let concurrent requests all observe
   * the same count and pass together, which is precisely the burst this exists
   * to stop. The CASE arms make it a fixed window: lastRequest is the window's
   * start and is only moved when a new window opens.
   */
  const result = await db.execute<{ count: number; last_request: string }>(sql`
    INSERT INTO rate_limit (id, key, count, last_request)
    VALUES (${randomUUID()}, ${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit.last_request <= ${windowStart} THEN 1
        ELSE rate_limit.count + 1
      END,
      last_request = CASE
        WHEN rate_limit.last_request <= ${windowStart} THEN ${now}
        ELSE rate_limit.last_request
      END
    RETURNING count, last_request
  `);

  const row = result.rows[0];

  // No row back means the statement did not behave as expected. Failing open is
  // the deliberate choice: a limiter outage must not take checkout down.
  if (!row) return { allowed: true };

  if (row.count <= max) return { allowed: true };

  const windowEnds = Number(row.last_request) + windowSeconds * 1000;

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnds - now) / 1000)),
  };
}
