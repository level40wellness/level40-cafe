import "server-only";
import { randomUUID } from "node:crypto";

import { env } from "@/env";
import { verifySignature } from "./signature";
import {
  WebhookVerificationError,
  type CheckoutSession,
  type CreateSessionInput,
  type PaymentEvent,
  type PaymentEventType,
  type PaymentGateway,
} from "./types";

const EVENT_TYPES: PaymentEventType[] = [
  "payment.succeeded",
  "payment.failed",
  "payment.cancelled",
];

function isEventType(value: unknown): value is PaymentEventType {
  return typeof value === "string" && EVENT_TYPES.includes(value as PaymentEventType);
}

/**
 * Fakes the gateway and nothing else. The order record, the server-computed
 * totals, the signed webhook, the idempotency check and the status machine are
 * all real, so switching to Stripe exercises code that has been running since
 * day one. The source app faked payment with setTimeout in the browser, which
 * meant none of that machinery existed to be tested.
 */
export const mockGateway: PaymentGateway = {
  provider: "mock",

  async createCheckoutSession(input: CreateSessionInput): Promise<CheckoutSession> {
    const sessionId = `mock_${randomUUID()}`;

    const redirectUrl = new URL(`/dev/pay/${sessionId}`, env.BETTER_AUTH_URL);
    redirectUrl.searchParams.set("amount", String(input.amountFils));
    redirectUrl.searchParams.set("order", String(input.orderNumber));
    redirectUrl.searchParams.set("return", input.returnUrl);

    return { sessionId, redirectUrl: redirectUrl.toString() };
  },

  async verifyWebhook(rawBody, signature): Promise<PaymentEvent> {
    if (!verifySignature(rawBody, signature, env.PAYMENT_WEBHOOK_SECRET)) {
      throw new WebhookVerificationError("Invalid signature");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new WebhookVerificationError("Body is not valid JSON");
    }

    const event = parsed as Record<string, unknown>;

    if (
      typeof event.id !== "string" ||
      typeof event.sessionId !== "string" ||
      typeof event.amountFils !== "number" ||
      !isEventType(event.type)
    ) {
      throw new WebhookVerificationError("Event is missing required fields");
    }

    return {
      id: event.id,
      type: event.type,
      sessionId: event.sessionId,
      amountFils: event.amountFils,
    };
  },
};
