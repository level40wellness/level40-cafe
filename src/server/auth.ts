import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { customSession, emailOTP } from "better-auth/plugins";

import { db } from "@/db";
import {
  account,
  rateLimit,
  session,
  user,
  userProfile,
  verification,
} from "@/db/schema";
import { env } from "@/env";
import { OTP_EXPIRY_MINUTES, sendOtpEmail, sendWelcomeEmail } from "@/server/email/send";
import { isAdmin } from "@/server/roles";

/**
 * Google sign-in existed in the source app, but it was brokered by Lovable's
 * own OAuth application (@lovable.dev/cloud-auth-js), so no credentials
 * belonging to this business exist to port. These are our own.
 */
export const isGoogleEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
  }),
  emailAndPassword: {
    enabled: true,
    // ⚠️ Flip to true only once the sending domain is verified in Resend and
    // EMAIL_FROM points at it. Until then Resend refuses every recipient except
    // the account owner, so requiring verification would lock out every real
    // customer at signup. The OTP handler below already covers the
    // "email-verification" type, so this is the only line that has to change.
    requireEmailVerification: false,
  },
  socialProviders: isGoogleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  /**
   * Buckets are keyed per (ip, path), so each entry below is its own counter.
   *
   * Two things about the implementation shape these numbers. First, the window
   * is not a fixed bucket that empties on a schedule: the count only resets
   * after a full `window` of silence on that path, so `max` has to cover a
   * whole continuous session rather than a calendar hour. Second, the row
   * pruner deletes anything whose lastRequest is older than the *global*
   * window, ignoring customRules — so the global window has to be at least as
   * long as the longest rule here, or those rows get swept and the limit
   * silently resets.
   *
   * Better Auth's own defaults already stop bursts (3 per 10s on /sign-in*,
   * 3 per 60s on the email senders). These add the sustained-abuse ceiling.
   */
  rateLimit: {
    // Better Auth defaults to production-only; stated outright because the
    // whole thing being a no-op locally is surprising otherwise.
    enabled: env.NODE_ENV === "production",
    window: 3600,
    max: 1000,
    // In-memory counters are per-instance on Vercel and die with the instance,
    // which is close to no limit at all. This is the load-bearing line.
    storage: "database",
    customRules: {
      // The hottest path by far — useSession fires it on page load. Sized so
      // no human trips it, while a script still does.
      "/get-session": { window: 60, max: 300 },
      // Credential stuffing. Generous enough to survive a forgotten password.
      "/sign-in/email": { window: 900, max: 20 },
      "/sign-up/email": { window: 3600, max: 10 },
      /**
       * Every one of these sends a real email through Resend. Unmetered, they
       * are both a bill and a way to get the sending domain classified as a
       * spam source using nothing but someone else's address.
       */
      "/email-otp/send-verification-otp": { window: 3600, max: 10 },
      "/email-otp/request-password-reset": { window: 3600, max: 10 },
      "/forget-password/email-otp": { window: 3600, max: 10 },
      // Code guessing. The plugin's allowedAttempts caps tries per code; this
      // caps how many codes an address can be walked through.
      "/email-otp/verify-email": { window: 900, max: 20 },
      "/email-otp/check-verification-otp": { window: 900, max: 20 },
      "/email-otp/reset-password": { window: 900, max: 20 },
      "/sign-in/email-otp": { window: 900, max: 20 },
    },
  },
  advanced: {
    /**
     * Without this the address cannot be resolved behind Vercel's proxy, and
     * Better Auth falls back to a single shared bucket for every visitor — one
     * abuser would lock out the whole site.
     *
     * Order matters: x-forwarded-for is a client-appendable chain, so it is the
     * last resort. The two before it are written by the platform.
     */
    ipAddress: {
      ipAddressHeaders: [
        "x-vercel-forwarded-for",
        "x-real-ip",
        "x-forwarded-for",
      ],
    },
  },
  databaseHooks: {
    user: {
      create: {
        /**
         * Replaces the Supabase `handle_new_user()` trigger. Better Auth already
         * fills name and image from the Google profile, so this only needs to
         * open the row that our own columns live in.
         */
        after: async (created) => {
          await db
            .insert(userProfile)
            .values({ userId: created.id })
            .onConflictDoNothing();

          // Not awaited into the failure path: sendWelcomeEmail never throws,
          // but it does add a network round trip to Resend, and nothing about
          // account creation should wait on it.
          void sendWelcomeEmail({
            userId: created.id,
            email: created.email,
            name: created.name ?? "",
          });
        },
      },
    },
  },
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendOtpEmail({ purpose: type, email, otp });
      },
      // Seconds. Kept in step with OTP_EXPIRY_MINUTES, which is what the email
      // tells the customer.
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      // Codes are compared, never displayed back, so there is no reason to hold
      // them in a form that turns a database read into account takeover.
      storeOTP: "hashed",
      allowedAttempts: 3,
      // This plugin also exposes POST /sign-in/email-otp. There is no switch to
      // remove that route, but this stops it from creating accounts, so it can
      // only ever act on an address that already registered by other means.
      disableSignUp: true,
    }),
    /**
     * Adds `isAdmin` to the session the browser already fetches, so the header
     * can hide the console link from customers without a second round trip.
     *
     * This is presentation only. The role is re-read on the server by the admin
     * layout and by requireAdmin() in every mutation, so a customer who forges
     * this flag in devtools gets a link that leads to a refusal — the same
     * mistake the source app made was trusting a browser-side check to *be* the
     * authorization, rather than to decide what to draw.
     *
     * Costs one indexed lookup per session fetch. Ordered before nextCookies,
     * which has to stay last.
     */
    customSession(async ({ user: sessionUser, session: currentSession }) => ({
      user: { ...sessionUser, isAdmin: await isAdmin(sessionUser.id) },
      session: currentSession,
    })),
    // Must be last: rewrites Set-Cookie from server actions into the Next
    // response. Without it, sign-in succeeds but no session cookie is stored.
    nextCookies(),
  ],
});
