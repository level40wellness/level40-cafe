"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { env } from "@/env";
import { isMockPayments } from "@/lib/payments";
import { signPayload } from "@/lib/payments/signature";
import type { PaymentEventType } from "@/lib/payments/types";

const OUTCOMES: Record<string, PaymentEventType> = {
  approve: "payment.succeeded",
  decline: "payment.failed",
  abandon: "payment.cancelled",
};

/**
 * Sends a signed event to the real webhook over real HTTP. Nothing here writes
 * to the database directly — the point of the mock is that the webhook, the
 * signature check, the idempotency guard and the status machine are all
 * exercised exactly as a live gateway would exercise them.
 */
export async function simulatePayment(formData: FormData) {
  if (!isMockPayments) {
    throw new Error("Payment simulation is only available with the mock gateway");
  }

  const sessionId = String(formData.get("sessionId") ?? "");
  const amountFils = Number(formData.get("amountFils") ?? 0);
  const returnUrl = String(formData.get("returnUrl") ?? "/");
  const outcome = OUTCOMES[String(formData.get("outcome") ?? "")];

  if (!sessionId || !outcome || !Number.isFinite(amountFils)) {
    throw new Error("Invalid simulation request");
  }

  const body = JSON.stringify({
    id: `evt_${randomUUID()}`,
    type: outcome,
    sessionId,
    amountFils,
  });

  const response = await fetch(
    new URL("/api/webhooks/payments", env.BETTER_AUTH_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-payment-signature": signPayload(body, env.PAYMENT_WEBHOOK_SECRET),
      },
      body,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Webhook rejected the event: ${response.status}`);
  }

  // redirect() throws internally, so it must sit outside any try/catch.
  redirect(returnUrl);
}
