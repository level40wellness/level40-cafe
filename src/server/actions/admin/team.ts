"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { TEAM_DESIGNATIONS } from "@/lib/team";
import { requireAdmin } from "@/server/guards";
import {
  type ActionResult,
  fromUnknownError,
  fromZodError,
} from "./result";

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  designation: z.enum(TEAM_DESIGNATIONS, {
    error: "Pick a designation from the list.",
  }),
  bio: z.string().trim().max(500, "Keep the bio under 500 characters.").optional(),
  imagePath: z.url("Upload a photo or leave it empty.").optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.coerce.boolean().default(true),
});

function parse(formData: FormData) {
  return memberSchema.safeParse({
    name: formData.get("name"),
    designation: formData.get("designation"),
    // Optional fields arrive as "" from an empty form control; zod's
    // .optional() accepts undefined but not an empty string.
    bio: formData.get("bio") || undefined,
    imagePath: formData.get("imagePath") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
    active: formData.get("active") === "on",
  });
}

/**
 * The homepage section is served with ISR (revalidate = 300); without this an
 * admin's change would take up to five minutes to appear.
 */
function revalidateTeam() {
  revalidatePath("/");
  revalidatePath("/admin/team");
}

export async function createTeamMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = parse(formData);
    if (!parsed.success) return fromZodError(parsed.error);

    const { name, designation, bio, imagePath, sortOrder, active } = parsed.data;
    await db.insert(teamMembers).values({
      name,
      designation,
      bio: bio ?? null,
      imagePath: imagePath ?? null,
      sortOrder,
      active,
    });

    revalidateTeam();
    return { ok: true, message: `Team member "${name}" added.` };
  } catch (error) {
    return fromUnknownError(error, "Could not add the team member.");
  }
}

export async function updateTeamMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown team member." };

    const parsed = parse(formData);
    if (!parsed.success) return fromZodError(parsed.error);

    const { name, designation, bio, imagePath, sortOrder, active } = parsed.data;
    const updated = await db
      .update(teamMembers)
      .set({
        name,
        designation,
        bio: bio ?? null,
        imagePath: imagePath ?? null,
        sortOrder,
        active,
      })
      .where(eq(teamMembers.id, id.data))
      .returning({ id: teamMembers.id });

    if (updated.length === 0) {
      return { ok: false, error: "That team member no longer exists." };
    }

    revalidateTeam();
    return { ok: true, message: `Team member "${name}" saved.` };
  } catch (error) {
    return fromUnknownError(error, "Could not save the team member.");
  }
}

export async function deleteTeamMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown team member." };

    // Report on what was actually removed — a DELETE matching nothing
    // succeeds, so an already-deleted row would otherwise confirm twice.
    const deleted = await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, id.data))
      .returning({ name: teamMembers.name });

    if (deleted.length === 0) {
      return { ok: false, error: "That team member no longer exists." };
    }

    revalidateTeam();
    return { ok: true, message: `Team member "${deleted[0].name}" removed.` };
  } catch (error) {
    return fromUnknownError(error, "Could not remove the team member.");
  }
}
