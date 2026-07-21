import "server-only";

import { env } from "@/env";
import { mockGateway } from "./mock";
import type { PaymentGateway } from "./types";

/**
 * Safety interlock: refuse to hand out a fake gateway in production.
 *
 * Checked when a gateway is requested rather than at module load. Module load
 * happens during `next build`, where NODE_ENV is already "production", so
 * throwing there made it impossible to deploy at all while the mock is in use —
 * which is the entire current phase. It would also have taken the whole site
 * down on a misconfiguration, rather than just the checkout.
 *
 * Call-time is no weaker: this runs before any payment is created or any
 * webhook is verified, so a fake payment still cannot be accepted.
 */
function assertProviderAllowed() {
  if (
    env.NODE_ENV === "production" &&
    env.PAYMENT_PROVIDER === "mock" &&
    env.ALLOW_MOCK_PAYMENTS !== "1"
  ) {
    throw new Error(
      "PAYMENT_PROVIDER=mock in production. Set a real provider, or set " +
        "ALLOW_MOCK_PAYMENTS=1 if you genuinely intend to accept fake payments.",
    );
  }
}

export function getPaymentGateway(): PaymentGateway {
  assertProviderAllowed();

  switch (env.PAYMENT_PROVIDER) {
    case "mock":
      return mockGateway;
    // case "stripe": return stripeGateway;  // Phase 6
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: ${env.PAYMENT_PROVIDER}`);
  }
}

export const isMockPayments = env.PAYMENT_PROVIDER === "mock";

export * from "./types";
