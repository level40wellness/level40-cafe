import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { HERO_IMG } from "@/lib/images";
import { safeInternalPath } from "@/lib/safe-redirect";
import { isGoogleEnabled } from "@/server/auth";
import { getSession } from "@/server/guards";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in or create an account at Level 40 to place orders and manage your meal plan.",
  alternates: { canonical: "/auth" },
  // No value to a search engine, and nothing here should be indexed.
  robots: { index: false, follow: true },
};

export default async function AuthPage({
  searchParams,
}: {
  // searchParams is a Promise in Next 16.
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const { mode, next } = await searchParams;
  const returnTo = safeInternalPath(next);

  const session = await getSession();

  // Already signed in — there is nothing for this page to do.
  if (session?.user) redirect(returnTo);

  return (
    <div className="login-page">
      <div className="login-visual">
        <Image
          src={HERO_IMG.cafeInterior}
          alt="Level 40 café interior"
          fill
          sizes="(min-width: 900px) 50vw, 100vw"
          className="object-cover"
          priority
        />
        <div className="caption">
          <span className="eyebrow">Level 40 · Members</span>
          <h2>
            Your table, your <em>meals, your rhythm.</em>
          </h2>
        </div>
      </div>

      <div className="login-form-side">
        <AuthForm
          initialMode={mode === "signup" ? "signup" : "signin"}
          googleEnabled={isGoogleEnabled}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}
