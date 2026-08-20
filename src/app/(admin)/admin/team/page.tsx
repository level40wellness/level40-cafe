import { TeamManager } from "@/components/admin/team-manager";
import { getAdminTeamMembers } from "@/server/queries/team";

export default async function AdminTeamPage() {
  const members = await getAdminTeamMembers();

  return <TeamManager items={members} />;
}
