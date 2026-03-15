"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface PasswordRule {
  text: string;
  test: (password: string) => boolean;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const passwordRules: PasswordRule[] = [
    { text: "At least 8 characters", test: (pwd) => pwd.length >= 8 },
    { text: "At least one uppercase letter", test: (pwd) => /[A-Z]/.test(pwd) },
    { text: "At least one number", test: (pwd) => /[0-9]/.test(pwd) },
    { text: "At least one special character", test: (pwd) => /[^A-Za-z0-9]/.test(pwd) }
  ];

  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else if (!passwordRules.every(rule => rule.test(newPassword))) {
      errors.newPassword = "Please meet all password requirements";
    }

    if (!confirmNewPassword) {
      errors.confirmNewPassword = "Please confirm your new password";
    } else if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = "Passwords do not match";
    }

    if (currentPassword === newPassword) {
      errors.newPassword = "New password must be different from current password";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateFields()) {
      return;
    }

    setLoading(true);

    try {
      // First verify the current password by signing in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User not found");
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        setError("Current password is incorrect");
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setFieldErrors({});
    } catch (err) {
      setError("An error occurred while updating your password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3 mb-4">
              <a
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </a>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Change Password
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Update your account password.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 px-6 py-6 sm:px-8 sm:py-8"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="currentPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Current password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${
                    fieldErrors.currentPassword
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (fieldErrors.currentPassword) {
                      setFieldErrors(prev => ({ ...prev, currentPassword: "" }));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showCurrentPassword ? "Hide" : "Show"}
                </button>
              </div>
              {fieldErrors.currentPassword && (
                <p className="text-xs text-rose-600">{fieldErrors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${
                    fieldErrors.newPassword
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) {
                      setFieldErrors(prev => ({ ...prev, newPassword: "" }));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordRules.map((rule, index) => {
                    const passed = rule.test(newPassword);
                    return (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <span className={`flex-shrink-0 ${passed ? "text-green-600" : "text-slate-400"}`}>
                          {passed ? "✓" : "○"}
                        </span>
                        <span className={passed ? "text-green-600" : "text-slate-500"}>
                          {rule.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {fieldErrors.newPassword && (
                <p className="text-xs text-rose-600">{fieldErrors.newPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmNewPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirmNewPassword"
                  type={showConfirmNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${
                    fieldErrors.confirmNewPassword || (confirmNewPassword.length > 0 && confirmNewPassword !== newPassword)
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    if (fieldErrors.confirmNewPassword) {
                      setFieldErrors(prev => ({ ...prev, confirmNewPassword: "" }));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showConfirmNewPassword ? "Hide" : "Show"}
                </button>
              </div>
              {confirmNewPassword.length > 0 && confirmNewPassword !== newPassword && (
                <p className="text-xs text-rose-600">Passwords do not match</p>
              )}
              {fieldErrors.confirmNewPassword && (
                <p className="text-xs text-rose-600">{fieldErrors.confirmNewPassword}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}

            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm text-green-800">
                  Password updated successfully!
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
