import "server-only";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { userRole } from "@/db/schema";
import { auth } from "./auth";

/**
 * Leaving Supabase removed row-level security, so authorization is no longer
 * enforced by the database. These guards are the replacement, and the rule that
 * makes them equivalent is structural: every query lives in src/server/queries,
 * every mutation in src/server/actions, and each mutation opens with one of
 * these calls. RLS failed closed by default; this only does if the discipline
 * holds, so it is not optional.
 */

export async function getSession() {
  // headers() is async in Next 16 — synchronous access was removed.
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }

  return session.user;
}

export async function isAdmin(userId: string) {
  const [row] = await db
    .select({ id: userRole.id })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.role, "admin")))
    .limit(1);

  return row !== undefined;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!(await isAdmin(user.id))) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
