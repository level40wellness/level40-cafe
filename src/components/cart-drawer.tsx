"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";

import { useCart } from "@/lib/cart";
import { formatFils } from "@/lib/format";

const VAT_RATE_BP = 500;

export function CartDrawer() {
  const {
    lines,
    count,
    subtotalFils,
    setQty,
    remove,
    drawerOpen,
    setDrawerOpen,
    tableNumber,
  } = useCart();

  // Close on Escape, and stop the page behind scrolling while open.
  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;

  // Indicative only. Checkout recomputes every figure server-side from
  // database prices — see the note in lib/cart.tsx.
  const vatFils = Math.round((subtotalFils * VAT_RATE_BP) / 10000);
  const totalFils = subtotalFils + vatFils;

  return (
    <>
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,13,8,.55)",
          zIndex: 90,
        }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        style={{
          position: "fixed",
          insetBlock: 0,
          insetInlineEnd: 0,
          width: "min(420px, 100vw)",
          background: "var(--cream)",
          zIndex: 91,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-18px 0 48px rgba(0,0,0,.28)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.3rem 1.4rem",
            borderBottom: "1px solid rgba(122,90,67,.16)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--display)",
                fontSize: "1.35rem",
                color: "var(--espresso)",
              }}
            >
              Your cart
            </div>
            <div className="cart-tagline">
              {tableNumber ? `Table ${tableNumber}` : `${count} ${count === 1 ? "item" : "items"}`}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setDrawerOpen(false)}
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--cocoa)",
              padding: ".4rem",
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div style={{ padding: "3rem 1.4rem", textAlign: "center", color: "var(--cocoa)" }}>
            <p style={{ marginBottom: "1.4rem" }}>Your cart is empty.</p>
            <Link href="/menu" className="btn btn-dark" onClick={() => setDrawerOpen(false)}>
              Browse Menu
            </Link>
          </div>
        ) : (
          <>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: "0 1.4rem",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {lines.map((line) => (
                <li
                  key={line.productId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr auto",
                    gap: "0.9rem",
                    alignItems: "center",
                    padding: "1rem 0",
                    borderBottom: "1px solid rgba(122,90,67,.12)",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 10,
                      background: line.imagePath
                        ? `var(--cream-2) url('${line.imagePath}') center/cover no-repeat`
                        : "var(--cream-2)",
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--display)",
                        fontSize: "1.02rem",
                        color: "var(--espresso)",
                      }}
                    >
                      {line.name}
                    </div>
                    <div style={{ fontSize: ".75rem", color: "var(--cocoa)" }}>
                      {formatFils(line.priceFils)} each
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: ".8rem",
                        marginTop: ".45rem",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          border: "1px solid rgba(122,90,67,.28)",
                          borderRadius: 999,
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`Decrease ${line.name}`}
                          onClick={() => setQty(line.productId, line.qty - 1)}
                          style={quantityButton}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span
                          style={{
                            minWidth: 22,
                            textAlign: "center",
                            fontSize: ".85rem",
                            color: "var(--espresso)",
                          }}
                        >
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${line.name}`}
                          onClick={() => setQty(line.productId, line.qty + 1)}
                          style={quantityButton}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.productId)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: ".35rem",
                          background: "none",
                          border: 0,
                          color: "var(--cocoa)",
                          fontSize: ".68rem",
                          letterSpacing: ".16em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--display)",
                      fontSize: "1.02rem",
                      color: "var(--espresso)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatFils(line.priceFils * line.qty)}
                  </div>
                </li>
              ))}
            </ul>

            <footer
              style={{
                padding: "1.2rem 1.4rem 1.6rem",
                borderTop: "1px solid rgba(122,90,67,.16)",
              }}
            >
              <div style={totalRow}>
                <span>Subtotal</span>
                <span>{formatFils(subtotalFils)}</span>
              </div>
              <div style={totalRow}>
                <span>VAT (5%)</span>
                <span>{formatFils(vatFils)}</span>
              </div>
              <div
                style={{
                  ...totalRow,
                  fontFamily: "var(--display)",
                  fontSize: "1.15rem",
                  color: "var(--espresso)",
                  marginTop: ".5rem",
                }}
              >
                <span>Total</span>
                <b>{formatFils(totalFils)}</b>
              </div>
              <Link
                href="/cart"
                className="btn btn-gold"
                onClick={() => setDrawerOpen(false)}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: "1.1rem",
                }}
              >
                View cart
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

const quantityButton: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--espresso)",
  background: "transparent",
  border: 0,
  cursor: "pointer",
};

const totalRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: ".85rem",
  color: "var(--cocoa)",
  padding: ".22rem 0",
};
