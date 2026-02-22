"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

type AuthMode = "signin" | "signup";

function friendlyError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Authentication failed. Please try again.";
  }

  const message = error.message;
  if (message.toLowerCase().includes("fetch failed") || message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("load failed")) {
    return "Could not reach Supabase auth. Check NEXT_PUBLIC_SUPABASE_URL, your internet connection, and that the project is active.";
  }

  if (message.includes("Invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (message.includes("Email rate limit exceeded")) {
    return "Too many attempts. Please wait and retry.";
  }

  return message;
}

export default function LoginPage() {
  const { user, isLoading, isConfigured, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ctaLabel = useMemo(() => {
    if (isSubmitting) {
      return mode === "signin" ? "Signing in..." : "Creating account...";
    }

    return mode === "signin" ? "Sign in" : "Create account";
  }, [isSubmitting, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        setStatus("Signed in successfully.");
      } else {
        const result = await signUp(email.trim(), password);
        if (result.requiresEmailConfirmation) {
          setStatus("Account created. Confirm your email, then sign in.");
        } else {
          setStatus("Account created and signed in.");
        }
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setStatus(null);
    setError(null);
    setIsSubmitting(true);
    try {
      await signOut();
      setStatus("Signed out.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section section-tight">
      <h1>Account</h1>
      <p className="muted" style={{ marginTop: "-0.4rem", marginBottom: "1rem" }}>
        Sign in so wallet selections are saved to your account across devices.
      </p>

      {!isConfigured ? (
        <div className="panel">
          <p>Supabase auth is not configured yet.</p>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
            <code>.env.local</code>.
          </p>
        </div>
      ) : null}

      {isConfigured ? (
        <div className="panel" style={{ maxWidth: "520px" }}>
          {isLoading ? <p>Loading session...</p> : null}

          {!isLoading && user ? (
            <>
              <p>
                Signed in as <strong>{user.email ?? user.id}</strong>
              </p>
              <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                <Link href="/wallet" className="btn btn-primary">
                  Open My Wallet
                </Link>
                <button type="button" className="btn btn-secondary" onClick={handleSignOut} disabled={isSubmitting}>
                  {isSubmitting ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </>
          ) : null}

          {!isLoading && !user ? (
            <>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <button
                  type="button"
                  className={mode === "signin" ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={mode === "signup" ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => setMode("signup")}
                >
                  Create account
                </button>
              </div>

              <form className="grid-form" onSubmit={handleSubmit}>
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    minLength={8}
                    required
                  />
                </label>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {ctaLabel}
                </button>
              </form>
            </>
          ) : null}

          {status ? (
            <p style={{ marginTop: "0.85rem", color: "var(--success)" }} aria-live="polite">
              {status}
            </p>
          ) : null}
          {error ? (
            <p style={{ marginTop: "0.85rem", color: "var(--danger)" }} aria-live="polite">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
