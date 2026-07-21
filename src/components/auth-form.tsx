"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { signIn, signUp } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export function AuthForm({
  initialMode,
  googleEnabled,
}: {
  initialMode: Mode;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    try {
      const result = isSignup
        ? await signUp.email({ email, password, name })
        : await signIn.email({ email, password });

      if (result.error) {
        toast.error(result.error.message ?? "Something went wrong");
        return;
      }

      toast.success(isSignup ? "Account created." : "Welcome back.");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);

    try {
      // Redirects away, so nothing after this runs on success.
      await signIn.social({ provider: "google", callbackURL: "/" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Google sign-in failed",
      );
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <div className="lbrand">
        <b>level 40</b>
        <span>{isSignup ? "Create account" : "Sign in"}</span>
      </div>
      <h1>{isSignup ? "Join Level 40" : "Welcome back"}</h1>
      <p className="hint">
        {isSignup
          ? "Create an account to order, subscribe to meal plans and track invoices."
          : "Sign in to place orders, manage subscriptions and view your history."}
      </p>

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="btn btn-block"
            style={{
              background: "#fff",
              color: "#1f2937",
              border: "1px solid #d1d5db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: ".6rem",
              marginBottom: "1rem",
              fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div
            style={{
              textAlign: "center",
              fontSize: ".68rem",
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "var(--cocoa)",
              margin: "0 0 1rem",
            }}
          >
            or
          </div>
        </>
      )}

      {isSignup && (
        <div className="field">
          <label htmlFor="auth-name">Your name</label>
          <input id="auth-name" name="name" type="text" autoComplete="name" required />
        </div>
      )}

      <div className="field">
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
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
        {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
      </button>

      <p className="hint" style={{ marginTop: "1rem", textAlign: "center" }}>
        {isSignup ? "Already have an account? " : "New to Level 40? "}
        <button
          type="button"
          onClick={() => setMode(isSignup ? "signin" : "signup")}
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
          {isSignup ? "Sign in" : "Create one"}
        </button>
      </p>

      <p className="hint" style={{ marginTop: ".8rem", textAlign: "center", fontSize: ".7rem" }}>
        By continuing you agree to our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </form>
  );
}
