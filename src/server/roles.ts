import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { userRole } from "@/db/schema";

/**
 * The role lookup, kept apart from guards.ts because auth.ts needs it too and
 * guards.ts imports auth.ts — leaving them in one file would make the pair
 * circular. There is exactly one definition of what "admin" means, and both the
 * server-side guards and the session enrichment read it from here.
 */
export async function isAdmin(userId: string) {
  const [row] = await db
    .select({ id: userRole.id })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.role, "admin")))
    .limit(1);

  return row !== undefined;
}
