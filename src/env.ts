import "server-only";
import { z } from "zod";

/**
 * Validated at module load so a missing or malformed variable fails the build
 * rather than surfacing as a runtime error on a customer's first request.
 *
 * Each migration phase adds only the variables it actually uses — payment
 * provider in Phase 3, blob token in Phase 4.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url(),
    // 32 bytes of entropy. Production must use a different value to development,
    // set in the Vercel dashboard rather than committed anywhere.
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    // Optional so the app runs before the Google Cloud project exists. Google
    // sign-in is simply hidden until both are present.
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    PAYMENT_PROVIDER: z.enum(["mock", "stripe"]).default("mock"),
    // Signs and verifies webhook payloads. In production this is the value the
    // real gateway gives you, not one you choose.
    PAYMENT_WEBHOOK_SECRET: z.string().min(32),
    // Deliberately awkward: only the literal "1" unlocks mock payments in
    // production, so it cannot be enabled by a stray truthy value.
    ALLOW_MOCK_PAYMENTS: z.string().optional(),
    // UAE VAT in basis points (500 = 5%). Config, not a constant: the source
    // hardcoded it in the browser, so a rate change meant a code change.
    VAT_RATE_BP: z.coerce.number().int().min(0).max(10000).default(500),
    // Resend. Optional so the app boots before the account exists; every send
    // becomes a logged no-op instead of a crash. Keys are prefixed "re_", so a
    // pasted-in-wrong value fails at boot rather than at the first signup.
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    // The sender lives in config, not code, because it is the single thing that
    // changes when the sending domain finishes verifying. Accepts a bare
    // address or "Display Name <address@domain>".
    EMAIL_FROM: z
      .string()
      .trim()
      .regex(
        /^(?:[^<>]+<\s*[^\s@<>]+@[^\s@<>]+\s*>|[^\s@<>]+@[^\s@<>]+)$/,
        'must be "name@domain" or "Display Name <name@domain>"',
      )
      .optional(),
    // Replies should reach a mailbox a human reads, which is not the sending
    // domain. Optional: without it, replies go to EMAIL_FROM.
    EMAIL_REPLY_TO: z.email().optional(),
  })
  .refine(
    (value) => !!value.GOOGLE_CLIENT_ID === !!value.GOOGLE_CLIENT_SECRET,
    // Half-configured OAuth fails at the redirect with an opaque Google error.
    // Better to refuse to boot.
    {
      error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together",
      path: ["GOOGLE_CLIENT_ID"],
    },
  )
  .refine((value) => !value.RESEND_API_KEY || !!value.EMAIL_FROM, {
    // A key without a sender would pass validation and then fail on every
    // single send with an opaque Resend error. Catch it at boot instead.
    error: "EMAIL_FROM is required whenever RESEND_API_KEY is set",
    path: ["EMAIL_FROM"],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
