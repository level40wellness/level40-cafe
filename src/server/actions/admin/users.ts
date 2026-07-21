"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { user, userRole } from "@/db/schema";
import { requireAdmin } from "@/server/guards";
import { type ActionResult, fromUnknownError } from "./result";

export async function grantAdminAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.string().min(1).safeParse(formData.get("userId"));
    if (!id.success) return { ok: false, error: "Unknown user." };

    const [target] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, id.data))
      .limit(1);

    if (!target) return { ok: false, error: "That user no longer exists." };

    // user_role_user_id_role_uniq makes a double-grant a no-op rather than a
    // duplicate row, so a double-click cannot corrupt the role table.
    await db
      .insert(userRole)
      .values({ userId: id.data, role: "admin" })
      .onConflictDoNothing();

    revalidatePath("/admin/users");
    return { ok: true, message: `${target.email} is now an admin.` };
  } catch (error) {
    return fromUnknownError(error, "Could not grant admin access.");
  }
}

export async function revokeAdminAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();

    const id = z.string().min(1).safeParse(formData.get("userId"));
    if (!id.success) return { ok: false, error: "Unknown user." };

    /**
     * Two locks the source app was missing. Its Users tab rendered "(you)"
     * next to your own row and then left the "Remove admin" button enabled,
     * so the only admin could revoke themselves and permanently lock the
     * console — with no way back, because the self-service "claim admin"
     * escape hatch only works while *no* admin exists.
     */
    if (id.data === actor.id) {
      return {
        ok: false,
        error:
          "You cannot remove your own admin access. Ask another admin to do it.",
      };
    }

    const [{ admins }] = await db
      .select({ admins: count() })
      .from(userRole)
      .where(eq(userRole.role, "admin"));

    if (admins <= 1) {
      return {
        ok: false,
        error: "That is the only admin account. Grant the role to someone else first.",
      };
    }

    const [target] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, id.data))
      .limit(1);

    /**
     * The count is re-asserted inside the DELETE rather than trusted from the
     * read above. Checking first and deleting second leaves a window in which
     * two admins revoking two different accounts both see "there are still 2"
     * and both succeed, taking the count to zero — which no one can undo from
     * inside the app.
     */
    const removed = await db
      .delete(userRole)
      .where(
        and(
          eq(userRole.userId, id.data),
          eq(userRole.role, "admin"),
          sql`(select count(*) from ${userRole} where ${userRole.role} = 'admin') > 1`,
        ),
      )
      .returning({ id: userRole.id });

    if (removed.length === 0) {
      return {
        ok: false,
        error: "That user is not an admin, or is now the last one.",
      };
    }

    revalidatePath("/admin/users");
    return {
      ok: true,
      message: `${target?.email ?? "That user"} is no longer an admin.`,
    };
  } catch (error) {
    return fromUnknownError(error, "Could not revoke admin access.");
  }
}
