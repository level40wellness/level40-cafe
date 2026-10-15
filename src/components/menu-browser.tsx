"use client";

import { useState } from "react";

import { AddToCart } from "@/components/add-to-cart";
import { formatFils } from "@/lib/format";
import { coverImage } from "@/lib/optimised-image";

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceFils: number;
  imagePath: string | null;
  /** Comma-separated nutrition facts ("420 kcal, 32g protein, …"). */
  nutrition: string | null;
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

  const visible =
    selected === "all"
      ? categories
      : categories.filter((category) => category.id === selected);
  // Items with a photo lead the grid; the rest (logo placeholder) follow.
  // Array sort is stable, so menu order is kept within each group.
  const items = visible
    .flatMap((category) => category.products)
    .sort((a, b) => Number(!a.imagePath) - Number(!b.imagePath));

  console.log("MenuBrowser", { items });  

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
        {items.map((item) => (
          <article key={item.id} className="m-card reveal in">
            <div
              className={item.imagePath ? "ph" : "ph ph-logo"}
              style={coverImage(item.imagePath, 750)}
            />
            <div className="body">
              <div className="top">
                <h3>{item.name}</h3>
                <span className="price">{formatFils(item.priceFils)}</span>
              </div>
              {item.description && <p className="desc">{item.description}</p>}
              {item.nutrition && (
                <div className="nutri-row">
                  {item.nutrition
                    .split(/[,|;•]/)
                    .map((fact) => fact.trim())
                    .filter(Boolean)
                    .map((fact, position) => (
                      <span key={`${fact}-${position}`} className="nutri-pill">
                        {fact}
                      </span>
                    ))}
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
        ))}
      </div>
    </>
  );
}
