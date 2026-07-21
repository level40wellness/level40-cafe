import "server-only";

import { sendEmail } from "./client";
import { type OtpPurpose, renderOtpEmail, renderWelcomeEmail } from "./templates";

/**
 * The only entry points the rest of the app should use. Each one owns the
 * decision about what a delivery failure means, which is the part that differs.
 */

/** Kept in sync with `emailOTP({ expiresIn })` in src/server/auth.ts. */
export const OTP_EXPIRY_MINUTES = 10;

/**
 * Fired from the Better Auth `user.create.after` hook, so it runs inside account
 * creation. It must never throw: a Resend outage would otherwise fail the
 * signup of a customer who has already been charged nothing and told nothing,
 * and leave a half-created account behind.
 *
 * Keyed on the user id so a retried signup cannot deliver two welcomes.
 */
export async function sendWelcomeEmail({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name: string;
}) {
  const { subject, html, text } = renderWelcomeEmail({ name });

  const result = await sendEmail({
    to: email,
    subject,
    html,
    text,
    idempotencyKey: `welcome:${userId}`,
  });

  if (!result.ok && result.reason !== "not-configured") {
    console.error(`[email] welcome email failed for user ${userId}.`);
  }
}

/**
 * Fired from `emailOTP({ sendVerificationOTP })`.
 *
 * ⚠️ This deliberately swallows failures rather than throwing, and that is a
 * security decision, not laziness. Better Auth answers a password-reset request
 * identically whether or not the account exists, so an attacker cannot use the
 * form to discover who has an account. If a send failure propagated, the two
 * cases would stop looking identical — an error would mean "this address is
 * registered" and a success would mean "it is not", handing over exactly what
 * the uniform response is there to hide.
 *
 * The cost is that a genuine delivery failure is invisible to the customer, who
 * sees "check your inbox" and waits. That is why the log line below is loud:
 * it is the only place the failure surfaces.
 */
export async function sendOtpEmail({
  purpose,
  email,
  otp,
}: {
  purpose: OtpPurpose;
  email: string;
  otp: string;
}) {
  const { subject, html, text } = renderOtpEmail({
    purpose,
    otp,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  });

  // No idempotency key: every request for a code must send a fresh one, because
  // a customer who did not receive the first will legitimately ask again.
  const result = await sendEmail({ to: email, subject, html, text });

  if (!result.ok) {
    console.error(
      `[email] ${purpose} OTP could not be delivered to ${email} (${result.reason}). ` +
        "The customer is being told to check their inbox and will see nothing.",
    );
  }
}

/**
 * Invoice delivery is Phase 5e and is not built here.
 *
 * It is not blocked on this module — sendEmail and the template layout above
 * are all it needs — but on the client's TRN. A UAE tax invoice must carry the
 * supplier's registration number, and `invoices.trn` is notNull with no value
 * to put in it. Emailing a document that misstates a tax registration is worse
 * than emailing nothing, so the seam stops here on purpose. See PENDING.md.
 */
