import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatFils } from "@/lib/format";
import { isMockPayments } from "@/lib/payments";
import { simulatePayment } from "@/server/actions/dev-payment";

export const metadata: Metadata = {
  title: "Payment simulator",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Stands in for the gateway's hosted checkout. Every button posts a signed
 * event to the real webhook, so development exercises the identical path a
 * live payment will take.
 */
export default async function DevPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ amount?: string; order?: string; return?: string }>;
}) {
  // Belt and braces alongside the boot-time interlock in lib/payments: if a
  // real gateway is configured, this page does not exist.
  if (!isMockPayments) notFound();

  const { sessionId } = await params;
  const query = await searchParams;

  const amountFils = Number(query.amount ?? 0);
  const returnUrl = query.return ?? "/";

  return (
    <section className="checkout">
      <div className="wrap" style={{ maxWidth: "34rem" }}>
        <div className="head">
          <span className="eyebrow center">Payment simulator</span>
          <h1>Not a real payment.</h1>
          <p>
            The mock gateway is active. Choosing an outcome below sends a signed
            webhook exactly as a live gateway would.
          </p>
        </div>

        <div className="co-panel">
          <h2>Order #{query.order ?? "—"}</h2>
          <p className="sub">
            Amount due <b>{formatFils(amountFils)}</b>
          </p>

          <div
            style={{
              border: "1px dashed rgba(122,90,67,.4)",
              borderRadius: 12,
              padding: "1rem 1.1rem",
              margin: "1.2rem 0",
              fontSize: ".8rem",
              color: "var(--cocoa)",
            }}
          >
            <div style={{ letterSpacing: ".18em", textTransform: "uppercase", fontSize: ".65rem" }}>
              Card number
            </div>
            <div style={{ fontFamily: "var(--display)", fontSize: "1.3rem", color: "var(--espresso)" }}>
              4242 4242 4242 4242
            </div>
            <div style={{ marginTop: ".4rem" }}>No card details are collected or sent anywhere.</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
            {(
              [
                { outcome: "approve", label: "Approve payment", className: "btn btn-gold" },
                { outcome: "decline", label: "Decline payment", className: "btn btn-dark" },
                { outcome: "abandon", label: "Abandon checkout", className: "btn" },
              ] as const
            ).map((action) => (
              <form key={action.outcome} action={simulatePayment}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="amountFils" value={amountFils} />
                <input type="hidden" name="returnUrl" value={returnUrl} />
                <input type="hidden" name="outcome" value={action.outcome} />
                <button
                  type="submit"
                  className={action.className}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {action.label}
                </button>
              </form>
            ))}
          </div>

          <p className="sub" style={{ marginTop: "1.2rem", fontSize: ".72rem" }}>
            Session <code>{sessionId}</code>
          </p>
        </div>
      </div>
    </section>
  );
}
