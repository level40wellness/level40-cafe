"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { setTableNumber } from "@/lib/cart";

/**
 * Dine-in QR codes link to /menu?table=12. Captures that once so the order
 * knows which table it belongs to. Writes to the cart store rather than React
 * state, so it survives navigation to checkout.
 */
export function TableSync() {
  const searchParams = useSearchParams();
  const table = searchParams.get("table");

  useEffect(() => {
    if (table) setTableNumber(table);
  }, [table]);

  return null;
}
