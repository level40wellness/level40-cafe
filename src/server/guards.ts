import "server-only";
import { headers } from "next/headers";

import { auth } from "./auth";
import { isAdmin } from "./roles";

// Re-exported so callers keep importing their authorization from one place,
// even though the query itself has to live outside this file.
export { isAdmin };

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

export async function requireAdmin() {
  const user = await requireUser();

  if (!(await isAdmin(user.id))) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
