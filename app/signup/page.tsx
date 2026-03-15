"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface PasswordRule {
  text: string;
  test: (password: string) => boolean;
}

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const passwordRules: PasswordRule[] = [
    { text: "At least 8 characters", test: (pwd) => pwd.length >= 8 },
    { text: "At least one uppercase letter", test: (pwd) => /[A-Z]/.test(pwd) },
    { text: "At least one number", test: (pwd) => /[0-9]/.test(pwd) },
    { text: "At least one special character", test: (pwd) => /[^A-Za-z0-9]/.test(pwd) }
  ];

  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (!passwordRules.every(rule => rule.test(password))) {
      errors.password = "Please meet all password requirements";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!validateFields()) {
      return;
    }

    setLoading(true);

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`
        }
      }
    });

    setLoading(false);

    // Handle duplicate email error
    if (signUpError) {
      if (signUpError.message.includes('User already registered') || 
          signUpError.message.includes('already been registered') ||
          signUpError.message.includes('duplicate')) {
        setError(
          <span>
            An account with this email already exists. Please login instead.{' '}
            <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Login
            </a>
          </span>
        );
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // Handle case where Supabase succeeds silently but user already exists
    if (data?.user && !data.user.identities?.length) {
      setError(
        <span>
          An account with this email already exists. Please login instead.{' '}
          <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Login
          </a>
        </span>
      );
      return;
    }

    setSignupSuccess(true);
  };

  if (signupSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Account created!
              </h1>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                A confirmation email has been sent to <span className="font-semibold text-slate-900">{email}</span>. 
                Please check your inbox and junk/spam folder to verify your account before logging in.
              </p>
              
              <a
                href="/login"
                className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px"
              >
                Go to Login
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Sign up
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create an account to save and revisit your invoices.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 px-6 py-6 sm:px-8 sm:py-8"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="firstName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${
                    fieldErrors.firstName
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (fieldErrors.firstName) {
                      setFieldErrors(prev => ({ ...prev, firstName: "" }));
                    }
                  }}
                  placeholder="John"
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-rose-600">{fieldErrors.firstName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="lastName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${
                    fieldErrors.lastName
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (fieldErrors.lastName) {
                      setFieldErrors(prev => ({ ...prev, lastName: "" }));
                    }
                  }}
                  placeholder="Smith"
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-rose-600">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

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
                className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${
                  fieldErrors.email
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors(prev => ({ ...prev, email: "" }));
                  }
                }}
                placeholder="john@example.com"
              />
              {fieldErrors.email && (
                <p className="text-xs text-rose-600">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${
                    fieldErrors.password
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors(prev => ({ ...prev, password: "" }));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordRules.map((rule, index) => {
                    const passed = rule.test(password);
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
              {fieldErrors.password && (
                <p className="text-xs text-rose-600">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className={`h-11 w-full rounded-2xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:ring-2 ${
                    fieldErrors.confirmPassword || (confirmPassword.length > 0 && confirmPassword !== password)
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors(prev => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-xs text-rose-600">Passwords do not match</p>
              )}
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-rose-600">{fieldErrors.confirmPassword}</p>
              )}
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
              {loading ? "Creating account..." : "Sign up"}
            </button>

            <p className="text-center text-xs text-slate-500">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Login
              </a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}