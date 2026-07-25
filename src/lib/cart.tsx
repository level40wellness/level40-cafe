"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Cart lines carry a snapshot of name and price so the drawer renders without
 * a database round trip. The snapshot is display-only: checkout re-reads every
 * price from the database server-side and never trusts these numbers. The
 * source app computed the payable total in the browser.
 */
export interface CartLine {
  /** Stable per-variant line id: the product plus the chosen size/colour. */
  id: string;
  productId: string;
  name: string;
  priceFils: number;
  imagePath: string | null;
  size?: string | null;
  color?: string | null;
  qty: number;
  notes?: string;
}

/**
 * Two lines are the same line only when the product *and* the chosen variant
 * match, so "Jute Mats — Black" and "Jute Mats — Green" stack separately.
 * Without the variant in the key they would merge and lose the distinction the
 * customer just made.
 */
export function cartLineId(
  productId: string,
  size?: string | null,
  color?: string | null,
): string {
  return `${productId}|${size ?? ""}|${color ?? ""}`;
}

// Bumped from v1: the line shape gained an id and variant fields, so a cart
// persisted by the old code is intentionally not read back.
const STORAGE_KEY = "l40.cart.v2";
const TABLE_KEY = "l40.table.v1";

/*
 * localStorage is the source of truth, read through useSyncExternalStore rather
 * than copied into state by an effect. That keeps server and client renders
 * consistent without a hydration flag, and makes the cart track changes made in
 * another tab for free.
 */

const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let tableNumber: string | null = null;
let loaded = false;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function loadOnce() {
  if (loaded) return;
  loaded = true;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CartLine[];
      // Defensive: guarantee every line has an id, so React keys and removals
      // stay stable even if an older-shaped line slips through.
      lines = parsed.map((line) =>
        line.id
          ? line
          : { ...line, id: cartLineId(line.productId, line.size, line.color) },
      );
    }
    tableNumber = localStorage.getItem(TABLE_KEY);
  } catch {
    // Corrupt or unavailable storage must not stop the site rendering.
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private browsing can reject writes; the cart still works in memory.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function onStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY && event.key !== TABLE_KEY) return;
    loaded = false;
    loadOnce();
    emit();
  }

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getLines() {
  loadOnce();
  return lines;
}

function getServerLines() {
  return EMPTY;
}

function getTable() {
  loadOnce();
  return tableNumber;
}

function getServerTable(): string | null {
  return null;
}

function setLines(next: CartLine[]) {
  lines = next;
  persist();
  emit();
}

export function setTableNumber(table: string | null) {
  tableNumber = table;

  try {
    if (table) localStorage.setItem(TABLE_KEY, table);
    else localStorage.removeItem(TABLE_KEY);
  } catch {
    // As above.
  }

  emit();
}

export function addToCart(line: Omit<CartLine, "qty" | "id">, qty = 1) {
  const id = cartLineId(line.productId, line.size, line.color);
  const existing = lines.find((candidate) => candidate.id === id);

  setLines(
    existing
      ? lines.map((candidate) =>
          candidate.id === id ? { ...candidate, qty: candidate.qty + qty } : candidate,
        )
      : [
          ...lines,
          { ...line, id, size: line.size ?? null, color: line.color ?? null, qty },
        ],
  );
}

export function removeFromCart(lineId: string) {
  setLines(lines.filter((line) => line.id !== lineId));
}

export function setCartQty(lineId: string, qty: number) {
  if (qty <= 0) {
    removeFromCart(lineId);
    return;
  }

  setLines(lines.map((line) => (line.id === lineId ? { ...line, qty } : line)));
}

export function clearCart() {
  setLines([]);
}

/** Drawer visibility is ephemeral UI state, so it stays in React rather than storage. */
interface CartContextValue {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const value = useMemo(() => ({ drawerOpen, setDrawerOpen }), [drawerOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  const lines = useSyncExternalStore(subscribe, getLines, getServerLines);
  const tableNumber = useSyncExternalStore(subscribe, getTable, getServerTable);

  const count = lines.reduce((total, line) => total + line.qty, 0);
  const subtotalFils = lines.reduce(
    (total, line) => total + line.priceFils * line.qty,
    0,
  );

  return {
    ...context,
    lines,
    tableNumber,
    count,
    subtotalFils,
    add: addToCart,
    remove: removeFromCart,
    setQty: setCartQty,
    clear: clearCart,
    setTableNumber,
  };
}
