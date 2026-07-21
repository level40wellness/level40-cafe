/**
 * The only payment surface application code is allowed to import. Swapping the
 * mock for Stripe in Phase 6 should be a new file plus an env var, not a
 * rewrite of checkout.
 */

export interface CreateSessionInput {
  orderId: string;
  orderNumber: number;
  amountFils: number;
  customerEmail: string;
  /** Absolute URL the customer returns to once the gateway is done. */
  returnUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  /** Where to send the browser to pay. */
  redirectUrl: string;
}

export type PaymentEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "payment.cancelled";

export interface PaymentEvent {
  /** Provider's own event id. Stored unique, so a replayed webhook is a no-op. */
  id: string;
  type: PaymentEventType;
  sessionId: string;
  amountFils: number;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export interface PaymentGateway {
  readonly provider: string;
  createCheckoutSession(input: CreateSessionInput): Promise<CheckoutSession>;
  /**
   * Must be given the raw request body. Parsing to JSON first and
   * re-serialising changes the bytes and invalidates every signature.
   */
  verifyWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent>;
}
