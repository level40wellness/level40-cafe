import type { Metadata } from "next";

import { ShopBrowser } from "@/components/shop-browser";
import { HERO_IMG } from "@/lib/images";
import { getShopCategories, getShopProducts } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Shop Yoga & Wellness",
  description:
    "Yoga mats, accessories, activewear and wellness essentials curated by Level 40.",
  alternates: { canonical: "/shop" },
};

/** See the note in menu/page.tsx. */
export const revalidate = 300;

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    getShopProducts(),
    getShopCategories(),
  ]);

  return (
    <>
      <section
        className="page-hero"
        style={{ backgroundImage: `url('${HERO_IMG.interior}')` }}
      >
        <div className="inner">
          <span className="eyebrow center">The Shop</span>
          <h1>
            Yoga &amp; <em>wellness.</em>
          </h1>
          <p>
            Carefully chosen mats, props, activewear and rituals — the Level 40
            table extended into your daily practice.
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <ShopBrowser products={products} categories={categories} />
        </div>
      </section>
    </>
  );
}
