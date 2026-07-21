import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth";

/**
 * Every Better Auth endpoint, including the Google callback that the Google
 * Cloud OAuth client must list as an authorized redirect URI:
 *   <origin>/api/auth/callback/google
 */
export const { GET, POST } = toNextJsHandler(auth);
