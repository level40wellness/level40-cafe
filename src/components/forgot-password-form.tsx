"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { emailOtp } from "@/lib/auth-client";

/**
 * Two steps on one page rather than two routes, because the OTP is bound to the
 * email address that requested it — a fresh page load would have to carry that
 * address in the URL, putting it in browser history and any referrer header.
 */
type Step = "request" | "reset";

export function ForgotPasswordForm({
  signInHref,
}: {
  /**
   * Where to hand back once the password is changed, with any ?next= already
   * narrowed by the page. A reset issues no session, so signing in again is
   * unavoidable — /auth/landing makes the role decision from there.
   */
  signInHref: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    const value = String(new FormData(event.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();

    try {
      const { error } = await emailOtp.requestPasswordReset({ email: value });

      // Better Auth answers identically whether or not the account exists, so
      // an error here is a genuine fault (malformed address, rate limit), not
      // "no such user". Reflecting it is safe.
      if (error) {
        toast.error(error.message ?? "Could not send the code. Try again.");
        return;
      }

      setEmail(value);
      setStep("reset");
    } catch {
      toast.error("Could not send the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const otp = String(form.get("otp") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    // Checked here rather than server-side because Better Auth takes a single
    // password field; the confirmation exists only to catch a typo before it
    // becomes a password nobody knows.
    if (password !== confirm) {
      toast.error("Those passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      const { error } = await emailOtp.resetPassword({ email, otp, password });

      if (error) {
        toast.error(error.message ?? "That code was not accepted.");
        return;
      }

      toast.success("Password changed. You can sign in now.");
      router.push(signInHref);
    } catch {
      toast.error("That code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "request") {
    return (
      <form className="login-card" onSubmit={handleRequest}>
        <div className="lbrand">
          <b>level 40</b>
          <span>Password reset</span>
        </div>
        <h1>Forgot your password?</h1>
        <p className="hint">
          Enter the email you signed up with and we will send you a six-digit
          code.
        </p>

        <div className="field">
          <label htmlFor="fp-email">Email</label>
          <input
            id="fp-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="btn btn-gold btn-block"
          disabled={busy}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {busy ? "Sending…" : "Send code"}
        </button>

        <p className="hint" style={{ marginTop: "1rem", textAlign: "center" }}>
          Remembered it? <Link href={signInHref}>Sign in</Link>
        </p>
      </form>
    );
  }

  return (
    <form className="login-card" onSubmit={handleReset}>
      <div className="lbrand">
        <b>level 40</b>
        <span>Password reset</span>
      </div>
      <h1>Enter your code</h1>
      <p className="hint">
        If <strong>{email}</strong> has an account, a six-digit code is on its
        way. It expires in 10 minutes.
      </p>

      <div className="field">
        <label htmlFor="fp-otp">Six-digit code</label>
        <input
          id="fp-otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          style={{ letterSpacing: ".4em", fontFamily: "monospace" }}
        />
      </div>

      <div className="field">
        <label htmlFor="fp-password">New password</label>
        <input
          id="fp-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="fp-confirm">Confirm new password</label>
        <input
          id="fp-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <button
        type="submit"
        className="btn btn-gold btn-block"
        disabled={busy}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {busy ? "Please wait…" : "Change password"}
      </button>

      <p className="hint" style={{ marginTop: "1rem", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => setStep("request")}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: "var(--gold)",
            cursor: "pointer",
            textDecoration: "underline",
            font: "inherit",
          }}
        >
          Use a different email
        </button>
      </p>
    </form>
  );
}
