"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { useCart } from "@/lib/cart";
import { formatFils } from "@/lib/format";

/**
 * Client-rendered because the cart lives in the browser. Metadata comes from
 * the sibling layout, since a "use client" page cannot export it.
 *
 * Every figure here is indicative. Checkout recomputes the payable total on
 * the server from database prices; the source app charged whatever the browser
 * calculated.
 */
const VAT_RATE_BP = 500;

export default function CartPage() {
  const { lines, count, subtotalFils, setQty, remove, tableNumber } = useCart();

  const vatFils = Math.round((subtotalFils * VAT_RATE_BP) / 10000);
  const totalFils = subtotalFils + vatFils;

  return (
    <section className="checkout">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow center">Your Cart</span>
          <h1>Review your order.</h1>
          <p>
            {tableNumber
              ? `Ordering for Table ${tableNumber}`
              : "Adjust quantities before you head to checkout."}
          </p>
        </div>

        {lines.length === 0 ? (
          <div className="cart-empty">
            <h2>Your cart is empty</h2>
            <p>Browse the menu and add a few dishes to get started.</p>
            <Link href="/menu" className="btn btn-dark">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="checkout-grid">
            <div className="co-panel">
              <h2>
                Items{" "}
                <span
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: ".7rem",
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    color: "var(--cocoa)",
                    fontWeight: 400,
                    marginInlineStart: ".6rem",
                  }}
                >
                  {count} {count === 1 ? "item" : "items"}
                </span>
              </h2>
              <p className="sub">Tap + / − to adjust quantities.</p>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {lines.map((line) => (
                  <li
                    key={line.productId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "68px 1fr auto",
                      gap: "1rem",
                      padding: "1rem 0",
                      borderBottom: "1px solid rgba(122,90,67,.12)",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 68,
                        height: 68,
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
                          fontSize: "1.1rem",
                          color: "var(--espresso)",
                          fontWeight: 500,
                        }}
                      >
                        {line.name}
                      </div>
                      <div
                        style={{
                          fontSize: ".78rem",
                          color: "var(--cocoa)",
                          marginTop: ".15rem",
                        }}
                      >
                        {formatFils(line.priceFils)} each
                      </div>
                      {line.notes && (
                        <div
                          style={{
                            fontSize: ".75rem",
                            fontStyle: "italic",
                            color: "var(--cocoa)",
                            marginTop: ".2rem",
                          }}
                        >
                          &ldquo;{line.notes}&rdquo;
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: ".9rem",
                          marginTop: ".5rem",
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
                            onClick={() => setQty(line.productId, line.qty - 1)}
                            aria-label={`Decrease ${line.name}`}
                            style={quantityButton}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span
                            style={{
                              minWidth: 24,
                              textAlign: "center",
                              fontSize: ".85rem",
                              fontWeight: 500,
                              color: "var(--espresso)",
                            }}
                          >
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.qty + 1)}
                            aria-label={`Increase ${line.name}`}
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
                            fontSize: ".7rem",
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
                        fontSize: "1.1rem",
                        color: "var(--espresso)",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatFils(line.priceFils * line.qty)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="os">
              <h2>
                Summary{" "}
                <span className="count">
                  {count} {count === 1 ? "item" : "items"}
                </span>
              </h2>
              <div
                className="os-totals"
                style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}
              >
                <div className="os-row">
                  <span>Subtotal</span>
                  <span>{formatFils(subtotalFils)}</span>
                </div>
                <div className="os-row">
                  <span>VAT (5%)</span>
                  <span>{formatFils(vatFils)}</span>
                </div>
                <div className="os-row grand">
                  <span>Total</span>
                  <b>{formatFils(totalFils)}</b>
                </div>
              </div>
              <p
                style={{
                  fontSize: ".72rem",
                  color: "var(--cocoa)",
                  marginTop: ".9rem",
                }}
              >
                Checkout arrives in the next phase.
              </p>
              <Link href="/menu" className="os-cta-secondary">
                Continue browsing
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

const quantityButton: React.CSSProperties = {
  width: 30,
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--espresso)",
  background: "transparent",
  border: 0,
  cursor: "pointer",
};
