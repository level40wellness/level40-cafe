"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import { clearCart, useCart } from "@/lib/cart";
import { formatFils } from "@/lib/format";
import { createCheckout } from "@/server/actions/checkout";

/**
 * Totals shown here are indicative. The server recomputes every figure from
 * database prices inside createCheckout; nothing the browser calculates is
 * trusted or even sent.
 */
const VAT_RATE_BP = 500;

export default function CheckoutPage() {
  const { lines, count, subtotalFils, tableNumber } = useCart();
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const vatFils = Math.round((subtotalFils * VAT_RATE_BP) / 10000);
  const totalFils = subtotalFils + vatFils;

  if (lines.length === 0 && !submitting) {
    return (
      <section className="checkout">
        <div className="wrap">
          <div className="cart-empty">
            <h2>Your cart is empty</h2>
            <p>Add a few dishes to your order before checking out.</p>
            <Link href="/menu" className="btn btn-dark">
              Browse Menu
            </Link>
          </div>
        </div>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      const result = await createCheckout({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        fulfilment: tableNumber ? "dine_in" : "pickup",
        tableNumber,
        notes: String(form.get("notes") ?? "") || undefined,
        // Ids, quantities and the chosen variant. Prices stay on the server.
        lines: lines.map((line) => ({
          productId: line.productId,
          qty: line.qty,
          size: line.size ?? null,
          color: line.color ?? null,
        })),
      });

      if (!result.ok) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }

      // The order exists and is pending payment; clearing now avoids a
      // duplicate order if the customer navigates back from the gateway.
      clearCart();
      window.location.href = result.redirectUrl;
    } catch {
      toast.error("Could not start checkout. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="checkout">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow center">Checkout</span>
          <h1>Almost yours.</h1>
          <p>
            {tableNumber
              ? `Serving Table ${tableNumber} — just confirm your details.`
              : "Just a few details and we'll start preparing your order."}
          </p>
        </div>

        <div className="checkout-grid">
          <form className="co-panel" onSubmit={handleSubmit}>
            <div className="pickup-banner">
              <svg viewBox="0 0 24 24">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div>
                <b>
                  {tableNumber
                    ? `Dine-in · Table ${tableNumber}`
                    : "Pickup · Jumeirah Village Circle"}
                </b>
                <span>Continents Tower, JVC · ready in ~45 min</span>
              </div>
            </div>

            <h2>Your details</h2>
            <p className="sub">
              We&apos;ll only use these to prepare and hand over your order.
            </p>

            <div className="field">
              <label htmlFor="co-name">Full name</label>
              <input
                id="co-name"
                name="name"
                type="text"
                defaultValue={session?.user.name ?? ""}
                placeholder="Layla Al-Amin"
                maxLength={80}
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="co-phone">Mobile number</label>
              <input
                id="co-phone"
                name="phone"
                type="tel"
                placeholder="+971 50 000 0000"
                maxLength={20}
                autoComplete="tel"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="co-email">Email</label>
              <input
                id="co-email"
                name="email"
                type="email"
                defaultValue={session?.user.email ?? ""}
                placeholder="you@email.com"
                maxLength={120}
                autoComplete="email"
                required
              />
            </div>
            <div className="field full">
              <label htmlFor="co-notes">Notes for the kitchen (optional)</label>
              <textarea id="co-notes" name="notes" maxLength={500} />
            </div>

            <p className="demo-note">
              Payment is in demo mode — you will be taken to a simulator, not a
              real card form. No money moves and no card details are collected.
            </p>

            <button type="submit" disabled={submitting} className="place-btn">
              {submitting ? (
                "Placing order…"
              ) : (
                <>
                  Place order · {formatFils(totalFils)}{" "}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <aside className="os">
            <h2>
              Your order{" "}
              <span className="count">
                {count} {count === 1 ? "item" : "items"}
              </span>
            </h2>
            {lines.map((line) => (
              <div className="os-item" key={line.id}>
                <div
                  className="os-thumb"
                  style={
                    line.imagePath
                      ? { backgroundImage: `url('${line.imagePath}')` }
                      : undefined
                  }
                />
                <div>
                  <div className="os-name">{line.name}</div>
                  {(line.size || line.color) && (
                    <div className="os-qty">
                      {[line.size, line.color].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div className="os-qty">
                    {formatFils(line.priceFils)} × {line.qty}
                  </div>
                </div>
                <div className="os-line">
                  {formatFils(line.priceFils * line.qty)}
                </div>
              </div>
            ))}
            <div className="os-totals">
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
          </aside>
        </div>
      </div>
    </section>
  );
}
