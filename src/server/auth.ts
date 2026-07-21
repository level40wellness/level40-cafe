import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import { account, session, user, userProfile, verification } from "@/db/schema";
import { env } from "@/env";

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
    // Turned on once a transactional email provider and a verified sending
    // domain exist. Until then, requiring verification would lock out signup.
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
        },
      },
    },
  },
  // Must be last: rewrites Set-Cookie from server actions into the Next
  // response. Without it, sign-in succeeds but no session cookie is stored.
  plugins: [nextCookies()],
});
