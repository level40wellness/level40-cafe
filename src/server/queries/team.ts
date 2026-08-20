import "server-only";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { requireAdmin } from "@/server/guards";

/** Members shown on the public site — active only, in display order. */
export async function getTeamMembers() {
  return db
    .select({
      id: teamMembers.id,
      name: teamMembers.name,
      designation: teamMembers.designation,
      bio: teamMembers.bio,
      imagePath: teamMembers.imagePath,
    })
    .from(teamMembers)
    .where(eq(teamMembers.active, true))
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.createdAt));
}

export type TeamMember = Awaited<ReturnType<typeof getTeamMembers>>[number];

/** Everything, including hidden members, for the admin console. */
export async function getAdminTeamMembers() {
  await requireAdmin();

  return db
    .select({
      id: teamMembers.id,
      name: teamMembers.name,
      designation: teamMembers.designation,
      bio: teamMembers.bio,
      imagePath: teamMembers.imagePath,
      sortOrder: teamMembers.sortOrder,
      active: teamMembers.active,
    })
    .from(teamMembers)
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.createdAt));
}

export type AdminTeamMember = Awaited<
  ReturnType<typeof getAdminTeamMembers>
>[number];
