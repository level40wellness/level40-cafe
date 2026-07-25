import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ProductPurchase } from "@/components/product-purchase";
import { formatFils } from "@/lib/format";
import { getActiveProductIds, getProductById } from "@/server/queries/catalog";

type Props = { params: Promise<{ productId: string }> };

/** See the note in menu/page.tsx. */
export const revalidate = 300;

/**
 * Prerenders every active product at build time. Anything added later is
 * rendered on first request and then cached, so new products do not 404.
 */
export async function generateStaticParams() {
  const ids = await getActiveProductIds("retail");
  return ids.map((productId) => ({ productId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // params is a Promise in Next 16 — synchronous access was removed.
  const { productId } = await params;
  // Scoped to retail: café dishes belong to /menu, not a product page.
  const product = await getProductById(productId, "retail");

  if (!product) return { title: "Product not found" };

  const description =
    product.description ?? "Yoga and wellness essentials by Level 40.";

  return {
    title: `${product.name} — Level 40 Shop`,
    description,
    alternates: { canonical: `/shop/${product.id}` },
    openGraph: {
      title: `${product.name} — Level 40 Shop`,
      description,
      images: product.imagePath ? [product.imagePath] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { productId } = await params;
  // Scoped to retail: café dishes belong to /menu, not a product page.
  const product = await getProductById(productId, "retail");

  // getProductById returns null for inactive products too, so an unpublished
  // item 404s rather than rendering.
  if (!product) notFound();

  return (
    // header.nav is position:fixed (68px under 960px, 84px above), so the top
    // padding has to clear it rather than merely space the content.
    <section className="bg-background pb-16 pt-24 text-foreground lg:pb-20 lg:pt-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-brass"
        >
          <ChevronLeft className="h-3 w-3" /> Back to shop
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary">
            {product.imagePath && (
              <Image
                src={product.imagePath}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            )}
          </div>

          <div className="lg:pt-4">
            {product.categoryName && (
              <p className="text-[11px] uppercase tracking-[0.2em] text-brass">
                {product.categoryName}
              </p>
            )}
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 font-display text-2xl text-brass">
              {formatFils(product.priceFils)}
            </p>
            {product.description && (
              <p className="mt-6 max-w-prose text-muted-foreground">
                {product.description}
              </p>
            )}

            {product.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <ProductPurchase
              productId={product.id}
              name={product.name}
              priceFils={product.priceFils}
              imagePath={product.imagePath}
              inStock={product.inStock}
              sizeOptions={product.sizeOptions}
              colorOptions={product.colorOptions}
            />

            <div className="mt-4">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-border px-6 text-sm font-medium text-foreground hover:border-brass hover:text-brass"
              >
                Continue shopping
              </Link>
            </div>

            <ul className="mt-10 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
              <li>· Free delivery across Dubai on orders above AED 250.</li>
              <li>· 14-day exchange on unused items.</li>
              <li>· Pick up in store at Continents Tower, JVC.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
