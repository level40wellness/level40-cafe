import { MealPlanManager } from "@/components/admin/meal-plan-manager";
import { getAdminMealPlans } from "@/server/queries/admin";

export default async function AdminMealPlansPage() {
  const plans = await getAdminMealPlans();

  return <MealPlanManager items={plans} />;
}
