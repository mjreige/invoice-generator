"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SupportPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?redirect=/support");
        return;
      }
      setUserEmail(user.email ?? "");
      const firstName = user.user_metadata?.first_name || "";
      const lastName = user.user_metadata?.last_name || "";
      if (firstName || lastName) setName(`${firstName} ${lastName}`.trim());
      setAuthLoading(false);
    };
    load();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: userEmail, subject, message }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20";

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">

          {/* Header */}
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Contact Support</h1>
                <p className="text-sm text-slate-500">We typically respond within 24 hours.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {sent ? (
              /* Success state */
              <div className="flex flex-col items-center text-center py-6 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Support request sent!</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Our team will review your message and get back to you at{" "}
                    <span className="font-medium text-slate-700">{userEmail}</span>.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="mt-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow hover:brightness-105 transition"
                >
                  Back to Home
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <span className="font-semibold">Looking for a refund?</span> We offer a 30-day money-back guarantee. Just send a message below with <span className="font-semibold">&quot;Refund&quot;</span> in the subject, or email{" "}
                  <a href="mailto:sales@ncgmgroup.com" className="font-medium underline">sales@ncgmgroup.com</a>.
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-100 px-4 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Issue with PDF generation"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 resize-none"
                    placeholder="Describe your issue or question..."
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
