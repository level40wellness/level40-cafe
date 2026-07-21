import type { Metadata } from "next";
import Link from "next/link";

import { formatFils } from "@/lib/format";
import { getOrderById } from "@/server/queries/orders";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { heading: string; body: string }> = {
  paid: {
    heading: "Thank you — your order is in.",
    body: "The kitchen has it. We'll have it ready in roughly 45 minutes.",
  },
  preparing: {
    heading: "We're cooking.",
    body: "Your order is being prepared right now.",
  },
  ready: {
    heading: "Ready for you.",
    body: "Your order is ready at Continents Tower, JVC.",
  },
  completed: {
    heading: "Order complete.",
    body: "Thank you for eating with us.",
  },
  pending_payment: {
    heading: "Waiting on payment.",
    body: "We have your order but payment has not completed yet.",
  },
  payment_failed: {
    heading: "Payment did not go through.",
    body: "Nothing has been charged. You can try again from your cart.",
  },
  cancelled: {
    heading: "Order cancelled.",
    body: "Nothing has been charged.",
  },
  refunded: {
    heading: "Order refunded.",
    body: "The payment has been returned to you.",
  },
};

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  // Keyed by UUID, and scoped to the owner for signed-in customers — see the
  // note in server/queries/orders.ts.
  const order = orderId ? await getOrderById(orderId) : null;

  if (!order) {
    return (
      <section className="checkout">
        <div className="wrap">
          <div className="cart-empty">
            <h2>We couldn&apos;t find that order</h2>
            <p>The link may be incomplete, or the order may belong to another account.</p>
            <Link href="/menu" className="btn btn-dark">
              Browse Menu
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.pending_payment;

  return (
    <section className="checkout">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow center">Order #{order.orderNumber}</span>
          <h1>{copy.heading}</h1>
          <p>{copy.body}</p>
        </div>

        <div className="checkout-grid">
          <div className="co-panel">
            <h2>What you ordered</h2>
            <p className="sub">
              {order.fulfilment === "dine_in" && order.tableNumber
                ? `Dine-in · Table ${order.tableNumber}`
                : "Pickup · Continents Tower, JVC"}
            </p>

            {order.items.map((item) => (
              <div className="os-item" key={item.id}>
                <div>
                  <div className="os-name">{item.name}</div>
                  <div className="os-qty">
                    {formatFils(item.unitPriceFils)} × {item.quantity}
                  </div>
                </div>
                <div className="os-line">{formatFils(item.lineTotalFils)}</div>
              </div>
            ))}
          </div>

          <aside className="os">
            <h2>Summary</h2>
            <div className="os-totals">
              <div className="os-row">
                <span>Subtotal</span>
                <span>{formatFils(order.subtotalFils)}</span>
              </div>
              <div className="os-row">
                <span>VAT ({order.vatRateBp / 100}%)</span>
                <span>{formatFils(order.vatFils)}</span>
              </div>
              <div className="os-row grand">
                <span>Total</span>
                <b>{formatFils(order.totalFils)}</b>
              </div>
            </div>
            <Link href="/menu" className="os-cta-secondary">
              Order something else
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
