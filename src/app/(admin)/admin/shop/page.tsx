import { ProductManager } from "@/components/admin/product-manager";
import { getAdminProducts, getAssignableCategories } from "@/server/queries/admin";

export default async function AdminShopPage() {
  const [items, categories] = await Promise.all([
    getAdminProducts("retail"),
    getAssignableCategories("retail"),
  ]);

  return <ProductManager kind="retail" items={items} categories={categories} />;
}
