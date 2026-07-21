"use client";

import { createAuthClient } from "better-auth/react";
import { customSessionClient, emailOTPClient } from "better-auth/client/plugins";

// Type-only, so the "server-only" marker in auth.ts is never bundled — the
// import is erased at compile time and nothing from the server reaches here.
import type { auth } from "@/server/auth";

/** Same-origin, so no baseURL is needed — it defaults to the current host. */
export const authClient = createAuthClient({
  // Infers the shape customSession returns, which is what puts `isAdmin` on
  // useSession().data.user without a hand-written type assertion.
  plugins: [emailOTPClient(), customSessionClient<typeof auth>()],
});

export const { useSession, signIn, signOut, signUp, emailOtp } = authClient;
