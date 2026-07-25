"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // Send the reset email. We intentionally do NOT reveal whether the address
    // has an account (anti-enumeration): any non-error outcome shows the same
    // neutral confirmation.
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    // Only surface true infrastructure errors; do not leak account existence.
    if (resetError && resetError.status && resetError.status >= 500) {
      setError("Something went wrong sending the email. Please try again in a moment.");
      return;
    }
    setSent(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Reset your password</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter your account email and we&apos;ll send you a link to set a new password.
            </p>
          </div>

          {sent ? (
            <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm text-green-800">
                  If an account exists for <strong>{email.trim()}</strong>, a password-reset link is on
                  its way. Check your inbox (and spam folder). The link expires after a short while.
                </p>
              </div>
              <a
                href="/login"
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Back to login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-rose-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>

              <p className="text-center text-xs text-slate-500">
                Remembered it?{" "}
                <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                  Back to login
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
