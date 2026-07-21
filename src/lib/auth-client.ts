"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/** Same-origin, so no baseURL is needed — it defaults to the current host. */
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});

export const { useSession, signIn, signOut, signUp, emailOtp } = authClient;
