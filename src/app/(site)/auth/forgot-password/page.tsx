import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { HERO_IMG } from "@/lib/images";
import { getSession } from "@/server/guards";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Reset the password on your Level 40 account.",
  alternates: { canonical: "/auth/forgot-password" },
  robots: { index: false, follow: true },
};

export default async function ForgotPasswordPage() {
  const session = await getSession();

  // Someone already signed in has no use for a reset code. There is no account
  // settings page yet, so their order history is the nearest sensible landing.
  if (session?.user) redirect("/account/orders");

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
            Back to your <em>table in a moment.</em>
          </h2>
        </div>
      </div>

      <div className="login-form-side">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
