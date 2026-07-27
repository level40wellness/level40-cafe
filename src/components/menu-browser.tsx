"use client";

import { useState } from "react";

import { AddToCart } from "@/components/add-to-cart";
import { formatFils } from "@/lib/format";

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceFils: number;
  imagePath: string | null;
  ingredients: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  products: MenuItem[];
}

/**
 * Filtering is client-side because the whole café menu is one small payload;
 * a round trip per filter click would be slower and worse offline. The items
 * themselves are fetched on the server so crawlers see the full menu.
 */
export function MenuBrowser({ categories }: { categories: MenuCategory[] }) {
  const [selected, setSelected] = useState<string>("all");

  console.log(categories);

  const visible =
    selected === "all"
      ? categories
      : categories.filter((category) => category.id === selected);

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
            className={`pill${selected === category.id ? " active" : ""}`}
            onClick={() => setSelected(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="menu-grid">
        {visible.flatMap((category) =>
          category.products.map((item) => (
            <article key={item.id} className="m-card reveal in">
              <div
                className="ph"
                style={
                  item.imagePath
                    ? { backgroundImage: `url('${item.imagePath}')` }
                    : { backgroundColor: "var(--cream-2)" }
                }
              />
              <div className="body">
                <div className="top">
                  <h3>{item.name}</h3>
                  <span className="price">{formatFils(item.priceFils)}</span>
                </div>
                {item.description && <p className="desc">{item.description}</p>}
                {item.ingredients && (
                  <div className="mt-3 mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Ingredients
                    </p>

                    <ul className="ml-5 grid grid-cols-2 gap-x-4 gap-y-2 list-disc text-xs leading-5 text-gray-600 marker:text-green-600">
                      {item.ingredients
                        .split(",")
                        .map((i) => i.trim())
                        .filter(Boolean)
                        .map((ingredient, index) => (
                          <li key={index}>{ingredient}</li>
                        ))}
                    </ul>
                  </div>
                )}
                <div className="foot">
                  <AddToCart
                    productId={item.id}
                    name={item.name}
                    priceFils={item.priceFils}
                    imagePath={item.imagePath}
                  />
                </div>
              </div>
            </article>
          )),
        )}
      </div>
    </>
  );
}
