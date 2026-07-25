"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface PasswordRule {
  text: string;
  test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  { text: "At least 8 characters", test: (pwd) => pwd.length >= 8 },
  { text: "At least one uppercase letter", test: (pwd) => /[A-Z]/.test(pwd) },
  { text: "At least one number", test: (pwd) => /[0-9]/.test(pwd) },
  { text: "At least one special character", test: (pwd) => /[^A-Za-z0-9]/.test(pwd) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState<boolean | null>(null); // null = still checking
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // The recovery link establishes a session (supabaseClient has detectSessionInUrl:true).
  // Wait for that session before allowing a password change; if none arrives, the link
  // is invalid/expired.
  useEffect(() => {
    let mounted = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setValidLink(true);
        setReady(true);
      }
    });

    // Fallback: the token may have already been exchanged before the listener attached.
    const timer = setTimeout(async () => {
      if (!mounted || ready) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setValidLink(!!session);
      setReady(true);
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!newPassword) errors.newPassword = "New password is required";
    else if (!passwordRules.every((r) => r.test(newPassword)))
      errors.newPassword = "Please meet all password requirements";
    if (!confirmNewPassword) errors.confirmNewPassword = "Please confirm your new password";
    else if (newPassword !== confirmNewPassword) errors.confirmNewPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
      // Sign out so the one-time recovery session can't linger, then send to login.
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("An error occurred while updating your password.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Set a new password</h1>
            <p className="mt-1 text-sm text-slate-600">Choose a new password for your account.</p>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
            {!ready && <p className="text-sm text-slate-500">Verifying your reset link…</p>}

            {ready && validLink === false && !success && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm text-rose-800">
                    This reset link is invalid or has expired. Please request a new one.
                  </p>
                </div>
                <a
                  href="/forgot-password"
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105"
                >
                  Request a new link
                </a>
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm text-green-800">
                  Password updated. Redirecting you to login…
                </p>
              </div>
            )}

            {ready && validLink && !success && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${fieldErrors.newPassword ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"}`}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); if (fieldErrors.newPassword) setFieldErrors((p) => ({ ...p, newPassword: "" })); }}
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700">
                      {showNew ? "Hide" : "Show"}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {passwordRules.map((rule, i) => {
                        const passed = rule.test(newPassword);
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`flex-shrink-0 ${passed ? "text-green-600" : "text-slate-400"}`}>{passed ? "✓" : "○"}</span>
                            <span className={passed ? "text-green-600" : "text-slate-500"}>{rule.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {fieldErrors.newPassword && <p className="text-xs text-rose-600">{fieldErrors.newPassword}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmNewPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmNewPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${fieldErrors.confirmNewPassword || (confirmNewPassword.length > 0 && confirmNewPassword !== newPassword) ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"}`}
                      value={confirmNewPassword}
                      onChange={(e) => { setConfirmNewPassword(e.target.value); if (fieldErrors.confirmNewPassword) setFieldErrors((p) => ({ ...p, confirmNewPassword: "" })); }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700">
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                  {confirmNewPassword.length > 0 && confirmNewPassword !== newPassword && <p className="text-xs text-rose-600">Passwords do not match</p>}
                  {fieldErrors.confirmNewPassword && <p className="text-xs text-rose-600">{fieldErrors.confirmNewPassword}</p>}
                </div>

                {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}

                <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70">
                  {loading ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
