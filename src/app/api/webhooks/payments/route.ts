import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { getPaymentGateway, WebhookVerificationError } from "@/lib/payments";

/** Never cached, and never prerendered. */
export const dynamic = "force-dynamic";

const OUTCOME = {
  "payment.succeeded": { payment: "succeeded", order: "paid" },
  "payment.failed": { payment: "failed", order: "payment_failed" },
  "payment.cancelled": { payment: "failed", order: "cancelled" },
} as const;

export async function POST(request: Request) {
  // Must be the raw text. Parsing to JSON and re-serialising changes the bytes
  // and every signature check would fail.
  const rawBody = await request.text();
  const signature = request.headers.get("x-payment-signature");

  const gateway = getPaymentGateway();

  let event;

  try {
    event = await gateway.verifyWebhook(rawBody, signature);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      // 400, not 500: the sender is wrong, so retrying will not help.
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

  const [payment] = await db
    .select({
      id: payments.id,
      orderId: payments.orderId,
      amountFils: payments.amountFils,
      status: payments.status,
      providerEventId: payments.providerEventId,
    })
    .from(payments)
    .where(eq(payments.providerSessionId, event.sessionId))
    .limit(1);

  if (!payment) {
    // 200 on purpose. The event is well-formed and correctly signed but refers
    // to nothing here; asking the gateway to retry forever helps no one.
    return Response.json({ received: true, matched: false });
  }

  // Idempotency. Gateways retry, and a duplicate must not advance the order a
  // second time. The unique constraint on provider_event_id is the real
  // guarantee; this check just avoids a pointless write.
  if (payment.providerEventId === event.id) {
    return Response.json({ received: true, duplicate: true });
  }

  if (payment.status !== "pending") {
    return Response.json({ received: true, alreadyResolved: true });
  }

  // The gateway is authoritative about what was charged, but a mismatch means
  // something is wrong and the order must not be marked paid.
  if (event.amountFils !== payment.amountFils) {
    return Response.json(
      { error: "Amount does not match the order" },
      { status: 409 },
    );
  }

  const outcome = OUTCOME[event.type];

  try {
    await db.batch([
      db
        .update(payments)
        .set({ status: outcome.payment, providerEventId: event.id })
        .where(eq(payments.id, payment.id)),
      db
        .update(orders)
        .set({ status: outcome.order })
        .where(eq(orders.id, payment.orderId!)),
    ]);
  } catch (error) {
    // Two copies of the same event racing: the unique index rejects the loser,
    // which is exactly the behaviour we want.
    if (error instanceof Error && error.message.includes("provider_event_id")) {
      return Response.json({ received: true, duplicate: true });
    }

    throw error;
  }

  return Response.json({ received: true });
}
