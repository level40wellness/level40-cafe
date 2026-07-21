"use client";

import { createAuthClient } from "better-auth/react";

/** Same-origin, so no baseURL is needed — it defaults to the current host. */
export const authClient = createAuthClient();

export const { useSession, signIn, signOut, signUp } = authClient;
