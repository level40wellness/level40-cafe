import { CustomerManager } from "@/components/admin/customer-manager";
import { UserManager } from "@/components/admin/user-manager";
import { requireAdmin } from "@/server/guards";
import { getCustomersData } from "@/server/queries/admin";

export default async function AdminUsersPage() {
  const [admin, customers] = await Promise.all([
    requireAdmin(),
    getCustomersData(),
  ]);

  return <CustomerManager customers={customers} />;
}
