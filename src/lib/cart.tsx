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
  productId: string;
  name: string;
  priceFils: number;
  imagePath: string | null;
  qty: number;
  notes?: string;
}

const STORAGE_KEY = "l40.cart.v1";
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
    if (stored) lines = JSON.parse(stored) as CartLine[];
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

export function addToCart(line: Omit<CartLine, "qty">, qty = 1) {
  const existing = lines.find((candidate) => candidate.productId === line.productId);

  setLines(
    existing
      ? lines.map((candidate) =>
          candidate.productId === line.productId
            ? { ...candidate, qty: candidate.qty + qty }
            : candidate,
        )
      : [...lines, { ...line, qty }],
  );
}

export function removeFromCart(productId: string) {
  setLines(lines.filter((line) => line.productId !== productId));
}

export function setCartQty(productId: string, qty: number) {
  if (qty <= 0) {
    removeFromCart(productId);
    return;
  }

  setLines(
    lines.map((line) => (line.productId === productId ? { ...line, qty } : line)),
  );
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
