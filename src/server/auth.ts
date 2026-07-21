import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { db } from "@/db";
import { account, session, user, userProfile, verification } from "@/db/schema";
import { env } from "@/env";
import { OTP_EXPIRY_MINUTES, sendOtpEmail, sendWelcomeEmail } from "@/server/email/send";

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
    schema: { user, session, account, verification },
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
    // Must be last: rewrites Set-Cookie from server actions into the Next
    // response. Without it, sign-in succeeds but no session cookie is stored.
    nextCookies(),
  ],
});
