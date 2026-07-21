import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { formatFils } from "@/lib/format";
import { getSession } from "@/server/guards";
import { getMyOrders } from "@/server/queries/orders";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Placed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  payment_failed: "Payment failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function OrdersPage() {
  const session = await getSession();

  if (!session?.user) redirect("/auth");

  // Scoped to the session inside the query — no id is ever accepted from the
  // caller. This is the RLS policy that used to say "users see their own rows".
  const orders = await getMyOrders();

  return (
    <section className="checkout">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow center">Your account</span>
          <h1>Order history.</h1>
          <p>Every order placed with this account.</p>
        </div>

        {orders.length === 0 ? (
          <div className="cart-empty">
            <h2>No orders yet</h2>
            <p>When you place an order it will appear here.</p>
            <Link href="/menu" className="btn btn-dark">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="co-panel">
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  padding: "1.1rem 0",
                  borderBottom: "1px solid rgba(122,90,67,.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--display)",
                        fontSize: "1.1rem",
                        color: "var(--espresso)",
                      }}
                    >
                      <Link href={`/order-confirmation?order=${order.id}`}>
                        Order #{order.orderNumber}
                      </Link>
                    </div>
                    <div style={{ fontSize: ".78rem", color: "var(--cocoa)" }}>
                      <time dateTime={order.placedAt.toISOString()}>
                        {order.placedAt.toLocaleDateString("en-AE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                      {" · "}
                      {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                      {" · "}
                      {STATUS_LABEL[order.status] ?? order.status}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--display)",
                      fontSize: "1.1rem",
                      color: "var(--espresso)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatFils(order.totalFils)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
