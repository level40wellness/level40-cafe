import { UserManager } from "@/components/admin/user-manager";
import { requireAdmin } from "@/server/guards";
import { getAdminUsers } from "@/server/queries/admin";

export default async function AdminUsersPage() {
  const [admin, users] = await Promise.all([requireAdmin(), getAdminUsers()]);

  return <UserManager users={users} currentUserId={admin.id} />;
}
