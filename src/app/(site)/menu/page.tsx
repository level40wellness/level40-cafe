import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MenuBrowser } from "@/components/menu-browser";
import { TableSync } from "@/components/table-sync";
import { HERO_IMG } from "@/lib/images";
import { getMenu } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Menu & Order",
  description:
    "Browse the Level 40 menu and order at your table or for pickup in Dubai.",
  alternates: { canonical: "/menu" },
};

/**
 * Prerendered, then revalidated every five minutes. Fully static would freeze
 * the menu at build time, so an admin price change would need a redeploy;
 * fully dynamic would give up the cached HTML that makes this page fast.
 */
export const revalidate = 300;

export default async function MenuPage() {
  // Fetched on the server, so the full menu is in the HTML for crawlers. The
  // source app fetched it in a browser effect, leaving the page empty to bots.
  const categories = await getMenu();

  return (
    <>
      {/* useSearchParams needs a Suspense boundary or the whole route opts out
          of static rendering. */}
      <Suspense fallback={null}>
        <TableSync />
      </Suspense>

      <section
        className="page-hero"
        style={{ backgroundImage: `url('${HERO_IMG.table}')` }}
      >
        <div className="inner">
          <span className="eyebrow center">The Menu</span>
          <h1>
            Order at <em>Level 40.</em>
          </h1>
          <p>
            Order for pickup — your meal will be ready in approximately 45
            minutes.
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <MenuBrowser categories={categories} />

          <div className="center-link" style={{ marginTop: "3rem" }}>
            <Link href="/cart" className="btn btn-dark">
              View cart
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
