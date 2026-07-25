"use client";

import Link from "next/link";
import { useState } from "react";

import { AddToCart } from "@/components/add-to-cart";
import type { ColorOption } from "@/db/schema/catalog";
import { formatFils } from "@/lib/format";

export interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  priceFils: number;
  imagePath: string | null;
  inStock: boolean;
  sizeOptions: string[];
  colorOptions: ColorOption[];
  categoryName: string | null;
  categorySlug: string | null;
}

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
}

export function ShopBrowser({
  products,
  categories,
}: {
  products: ShopItem[];
  categories: ShopCategory[];
}) {
  const [selected, setSelected] = useState<string>("all");

  const visible =
    selected === "all"
      ? products
      : products.filter((product) => product.categorySlug === selected);

  return (
    <>
      <div className="filters">
        <button
          type="button"
          className={`pill${selected === "all" ? " active" : ""}`}
          onClick={() => setSelected("all")}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`pill${selected === category.slug ? " active" : ""}`}
            onClick={() => setSelected(category.slug)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {visible.map((product) => (
          <div key={product.id} className="prod reveal in">
            <Link href={`/shop/${product.id}`} aria-label={product.name}>
              <div
                className="ph"
                style={
                  product.imagePath
                    ? { backgroundImage: `url('${product.imagePath}')` }
                    : { backgroundColor: "var(--cream-2)" }
                }
              >
                {product.categoryName ? (
                  <span className="badge">{product.categoryName}</span>
                ) : null}
              </div>
            </Link>
            <div className="info">
              <h3>
                <Link href={`/shop/${product.id}`}>{product.name}</Link>
              </h3>
              {product.description && <p>{product.description}</p>}
              <div className="row">
                <span className="price">{formatFils(product.priceFils)}</span>
                {product.sizeOptions.length > 0 || product.colorOptions.length > 0 ? (
                  // Options must be chosen on the product page, so quick-add is
                  // replaced by a link there rather than adding an unspecified
                  // variant straight to the cart.
                  <Link href={`/shop/${product.id}`} className="add">
                    Choose options
                  </Link>
                ) : (
                  <AddToCart
                    productId={product.id}
                    name={product.name}
                    priceFils={product.priceFils}
                    imagePath={product.imagePath}
                    inStock={product.inStock}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
