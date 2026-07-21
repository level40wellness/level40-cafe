import { redirect } from "next/navigation";

import { safeInternalPath } from "@/lib/safe-redirect";
import { getSession, isAdmin } from "@/server/guards";

/**
 * Decides where a sign-in lands.
 *
 * All three sign-in paths route through here — email, signup, and Google, which
 * redirects straight from the OAuth callback and so never gives the client a
 * chance to branch. Only the server can read the role, so the choice is made
 * once here instead of being duplicated into each caller.
 *
 * This renders nothing: every path out of it is a redirect.
 */
export const dynamic = "force-dynamic";

export default async function AuthLandingPage({
  // searchParams is a Promise in Next 16.
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getSession();

  // Reachable by typing the URL, and by anyone whose sign-in did not actually
  // take. Neither should fall through to the admin check below.
  if (!session?.user) redirect("/auth");

  /**
   * An empty fallback rather than the usual "/" is what separates "asked for
   * nothing" from "asked for the homepage". Only the first case gets the role
   * default, so an admin who was interrupted on the way to /shop still lands on
   * /shop. The value is narrowed here as well as at the caller, because this
   * route is reachable directly.
   */
  const requested = safeInternalPath(next, "");

  if (requested) redirect(requested);

  // Convenience only. /admin has its own server-side gate, and every mutation
  // behind it calls requireAdmin() — nothing here grants access to anything.
  redirect((await isAdmin(session.user.id)) ? "/admin" : "/");
}
