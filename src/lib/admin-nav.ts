import {
  ClipboardList,
  LayoutDashboard,
  Repeat,
  ShoppingBag,
  Tags,
  UtensilsCrossed,
  Users,
} from "lucide-react";

/**
 * One definition of the admin sections, shared by the sidebar and the topbar
 * title. The source app derived its heading from the same array that rendered
 * the buttons; keeping that property matters more now that each section is a
 * real route and the two components no longer sit in the same file.
 */
export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/menu", label: "Café Menu", icon: UtensilsCrossed },
  { href: "/admin/shop", label: "Retail Shop", icon: ShoppingBag },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/meal-plans", label: "Meal Plans", icon: Repeat },
  { href: "/admin/users", label: "Users & Admins", icon: Users },
] as const;

export type AdminNavItem = (typeof ADMIN_NAV)[number];

/**
 * Longest matching href wins, so /admin/orders does not also light up
 * /admin — every section is nested under the overview's path.
 */
export function activeNavItem(pathname: string): AdminNavItem | undefined {
  return [...ADMIN_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
}
