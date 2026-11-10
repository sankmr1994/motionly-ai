"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";

type Mode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: "/onboarding",
        });
        if (result.error) throw new Error(result.error.message);
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else if (mode === "sign-in") {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/dashboard",
        });
        if (result.error) throw new Error(result.error.message);
        router.push("/dashboard");
        router.refresh();
      } else if (mode === "forgot-password") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw new Error(result.error.message);
        setMessage(
          "If that address belongs to an account, a reset link is on its way.",
        );
      } else {
        if (!token)
          throw new Error("This password-reset link is invalid or expired.");
        const result = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (result.error) throw new Error(result.error.message);
        router.push("/sign-in?reset=success");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const isSignUp = mode === "sign-up";
  const isReset = mode === "reset-password";
  const isForgot = mode === "forgot-password";

  return (
    <form className="auth-form" onSubmit={submit}>
      {isSignUp ? (
        <label>
          Your name
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            placeholder="Aditi Sharma"
          />
        </label>
      ) : null}
      {!isReset ? (
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </label>
      ) : null}
      {!isForgot ? (
        <label>
          {isReset ? "New password" : "Password"}
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                isReset || isSignUp ? "new-password" : "current-password"
              }
              required
              minLength={10}
              placeholder="At least 10 characters"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
      ) : null}
      {mode === "sign-in" ? (
        <Link className="form-link" href="/forgot-password">
          Forgot password?
        </Link>
      ) : null}
      {message ? (
        <p className="form-message" role="status">
          {message}
        </p>
      ) : null}
      <button className="button button-primary auth-submit" disabled={pending}>
        {pending
          ? "Please wait…"
          : isSignUp
            ? "Create account"
            : isForgot
              ? "Send reset link"
              : isReset
                ? "Set new password"
                : "Sign in"}
      </button>
    </form>
  );
}
