import { CartDrawer } from "@/components/cart-drawer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CartProvider } from "@/lib/cart";

/**
 * Storefront chrome. The route group keeps these URLs unchanged — (site) does
 * not appear in the path — while giving /admin a sibling layout that shares
 * nothing but the fonts.
 */
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <CartDrawer />
    </CartProvider>
  );
}
