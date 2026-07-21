"use client";

import { toast } from "sonner";

import { addToCart } from "@/lib/cart";

/**
 * Props are passed explicitly rather than importing a type from the queries
 * module, which is server-only. Keeping the boundary obvious matters more here
 * than saving a few keystrokes.
 */
export interface AddToCartProps {
  productId: string;
  name: string;
  priceFils: number;
  imagePath: string | null;
  inStock?: boolean;
  className?: string;
  label?: string;
  openDrawer?: () => void;
  children?: React.ReactNode;
}

export function AddToCart({
  productId,
  name,
  priceFils,
  imagePath,
  inStock = true,
  className = "add",
  label = "Add +",
  openDrawer,
  children,
}: AddToCartProps) {
  return (
    <button
      type="button"
      className={className}
      disabled={!inStock}
      onClick={() => {
        addToCart({ productId, name, priceFils, imagePath });
        toast.success(`${name} added to cart`);
        openDrawer?.();
      }}
    >
      {children ?? (inStock ? label : "Out")}
    </button>
  );
}
