import "server-only";
import { Resend } from "resend";

import { env } from "@/env";

/**
 * Transactional email, wrapped so that no caller ever has to care whether
 * Resend is configured, reachable, or refusing the recipient.
 *
 * Nothing in this module throws. Email is a side effect of something the user
 * actually asked for — creating an account, resetting a password — and a
 * provider outage must never turn that into a failed request. Callers get a
 * result they can log or ignore; the decision about whether a failure is fatal
 * belongs to them, and so far the answer is always "no". See send.ts.
 */

export const isEmailEnabled = Boolean(env.RESEND_API_KEY);

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * True while we are still on Resend's shared testing sender. In that state
 * Resend rejects every recipient except the address the account is registered
 * under, with a 403 — so a "successful" signup by anyone else silently gets no
 * welcome mail. Worth a loud log line rather than a puzzling absence.
 */
const isTestingSender = Boolean(env.EMAIL_FROM?.includes("@resend.dev"));

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; reason: string };

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Absent means a worse spam score, so it is required. */
  text: string;
  /**
   * Makes a retry of the same logical event collapse into one delivery rather
   * than two. Resend keeps these for 24h.
   */
  idempotencyKey?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  idempotencyKey,
}: SendEmailInput): Promise<SendResult> {
  if (!resend || !env.EMAIL_FROM) {
    console.warn(
      `[email] skipped "${subject}" to ${to}: RESEND_API_KEY is not set.`,
    );
    return { ok: false, reason: "not-configured" };
  }

  try {
    const { data, error } = await resend.emails.send(
      {
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
        text,
        ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    if (error) {
      console.error(
        `[email] Resend rejected "${subject}" to ${to}: ${error.name} — ${error.message}`,
      );

      if (isTestingSender) {
        console.error(
          "[email] EMAIL_FROM is still @resend.dev, which may only send to " +
            "the address your Resend account is registered under. Verify " +
            "level40wellness.com and point EMAIL_FROM at it.",
        );
      }

      return { ok: false, reason: error.name };
    }

    if (!data) {
      // Should not happen: Resend returns either data or error. Treated as a
      // failure rather than asserted away, because a silent success here would
      // mean a password reset nobody can complete.
      console.error(`[email] Resend returned no id for "${subject}" to ${to}.`);
      return { ok: false, reason: "empty-response" };
    }

    return { ok: true, id: data.id };
  } catch (error) {
    // Network failure, DNS, timeout — never the caller's problem.
    console.error(
      `[email] could not send "${subject}" to ${to}:`,
      error instanceof Error ? error.message : error,
    );
    return { ok: false, reason: "transport-error" };
  }
}
