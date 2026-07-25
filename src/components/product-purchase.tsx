"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import type { ColorOption } from "@/db/schema/catalog";
import { addToCart, useCart } from "@/lib/cart";

/**
 * The buy box on a retail product page. When a product carries Size or Colour
 * options the customer must pick one of each before "Add to cart" enables — the
 * choice is then carried into the cart line (and, at checkout, the order).
 */
export interface ProductPurchaseProps {
  productId: string;
  name: string;
  priceFils: number;
  imagePath: string | null;
  inStock: boolean;
  sizeOptions: string[];
  colorOptions: ColorOption[];
}

export function ProductPurchase({
  productId,
  name,
  priceFils,
  imagePath,
  inStock,
  sizeOptions,
  colorOptions,
}: ProductPurchaseProps) {
  const { setDrawerOpen } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  const needsSize = sizeOptions.length > 0;
  const needsColor = colorOptions.length > 0;
  const ready = inStock && (!needsSize || size !== null) && (!needsColor || color !== null);

  function handleAdd() {
    if (!ready) return;
    addToCart({ productId, name, priceFils, imagePath, size, color });
    toast.success(`${name}${variantSuffix(size, color)} added to cart`);
    setDrawerOpen(true);
  }

  return (
    <div className="mt-8">
      {needsSize && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Size
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizeOptions.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={size === option}
                onClick={() => setSize(option)}
                className={`min-w-11 rounded-full border px-4 py-2 text-sm transition ${
                  size === option
                    ? "border-brass bg-brass text-brass-foreground"
                    : "border-border text-foreground hover:border-brass"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsColor && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Colour{color ? ` — ${color}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colorOptions.map((option) =>
              option.hex ? (
                <button
                  key={option.name}
                  type="button"
                  title={option.name}
                  aria-label={option.name}
                  aria-pressed={color === option.name}
                  onClick={() => setColor(option.name)}
                  className={`h-9 w-9 rounded-full border transition ${
                    color === option.name
                      ? "ring-2 ring-brass ring-offset-2 ring-offset-background border-transparent"
                      : "border-border hover:opacity-80"
                  }`}
                  style={{ backgroundColor: option.hex }}
                />
              ) : (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={color === option.name}
                  onClick={() => setColor(option.name)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    color === option.name
                      ? "border-brass bg-brass text-brass-foreground"
                      : "border-border text-foreground hover:border-brass"
                  }`}
                >
                  {option.name}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!ready}
          className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brass px-6 text-sm font-semibold text-brass-foreground shadow-md shadow-black/20 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {buttonLabel({ inStock, needsSize, size, needsColor, color })}
        </button>
      </div>
    </div>
  );
}

function variantSuffix(size: string | null, color: string | null): string {
  const parts = [size, color].filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

function buttonLabel({
  inStock,
  needsSize,
  size,
  needsColor,
  color,
}: {
  inStock: boolean;
  needsSize: boolean;
  size: string | null;
  needsColor: boolean;
  color: string | null;
}): string {
  if (!inStock) return "Out of stock";
  if (needsSize && !size) return "Select a size";
  if (needsColor && !color) return "Select a colour";
  return "Add to cart";
}
