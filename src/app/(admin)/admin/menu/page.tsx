import { ProductManager } from "@/components/admin/product-manager";
import { getAdminProducts, getAssignableCategories } from "@/server/queries/admin";

export default async function AdminMenuPage() {
  const [items, categories] = await Promise.all([
    getAdminProducts("cafe"),
    getAssignableCategories("cafe"),
  ]);

  return <ProductManager kind="cafe" items={items} categories={categories} />;
}
