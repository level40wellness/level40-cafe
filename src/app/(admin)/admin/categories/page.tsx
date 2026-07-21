import { CategoryManager } from "@/components/admin/category-manager";
import { getAdminCategories } from "@/server/queries/admin";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return <CategoryManager items={categories} />;
}
