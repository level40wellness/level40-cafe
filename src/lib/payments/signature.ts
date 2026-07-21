import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-SHA256 over the raw body, the same shape Stripe and most gateways use.
 * Lives apart from the mock so the dev pay page can sign a request without
 * importing the gateway itself.
 */
export function signPayload(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!signature) return false;

  const expected = signPayload(rawBody, secret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  // timingSafeEqual throws on a length mismatch, so check that first — and
  // comparing with === would leak the secret one byte at a time.
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
