"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import UpgradePopup from "@/components/UpgradePopup";
import Link from "next/link";

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const { plan, isActive, hasCredits, creditsRemaining } = useSubscription();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setSubscription(data);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleCancelSubscription = async () => {
    if (!subscription?.paddle_subscription_id) {
      setError("No subscription ID found.");
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.paddle_subscription_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to cancel");
      setCancelSuccess(true);
      setShowCancelModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to cancel. Please contact support at sales@ncgmgroup.com");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </main>
    );
  }

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/")} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Manage Subscription</h1>
                <p className="text-sm text-slate-500">View and manage your current plan</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8 space-y-6">

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
            )}

            {/* Post-cancellation success state */}
            {cancelSuccess && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-green-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">Subscription cancelled</span>
                </div>
                {periodEnd && (
                  <p className="text-sm text-green-700">You will retain full access until <strong>{periodEnd}</strong>.</p>
                )}
                <p className="text-sm text-green-700">After that, you can buy invoice credits to continue without a monthly commitment.</p>
                <button
                  onClick={() => setShowUpgradePopup(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition"
                >
                  Buy Credits for After Expiry
                </button>
              </div>
            )}

            {/* Current Plan */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Current Plan</h2>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      plan === "business" ? "bg-purple-100 text-purple-700" :
                      plan === "pro" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Business"}
                    </span>
                    {isActive && <span className="text-xs text-green-600 font-medium">● Active</span>}
                    {cancelSuccess && <span className="text-xs text-amber-600 font-medium">● Cancelled</span>}
                  </div>
                  {periodEnd && isActive && (
                    <p className="text-sm text-slate-500">Next billing: {periodEnd}</p>
                  )}
                  {periodEnd && cancelSuccess && (
                    <p className="text-sm text-slate-500">Access until: {periodEnd}</p>
                  )}
                  {/* Show credits info for credits users */}
                  {!isActive && hasCredits && (
                    <p className="text-sm text-slate-500">Credits remaining: {creditsRemaining}</p>
                  )}
                </div>
                <Link href="/pricing" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  View plans →
                </Link>
              </div>
            </div>

            {/* Buy Credits — only for NON-active subscribers */}
            {!isActive && !cancelSuccess && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <h2 className="text-sm font-semibold text-blue-900 mb-1">Buy Invoice Credits</h2>
                <p className="text-sm text-blue-700 mb-3">One-time purchase — never expires. Top up whenever you need more invoices.</p>
                <button
                  onClick={() => setShowUpgradePopup(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
                >
                  Buy Credits
                </button>
              </div>
            )}

            {/* Cancel — only for active subscribers who haven't cancelled yet */}
            {isActive && !cancelSuccess && subscription?.paddle_subscription_id && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
                <h2 className="text-sm font-semibold text-rose-800 mb-1">Cancel Subscription</h2>
                <p className="text-sm text-rose-600 mb-3">Your access continues until the end of your current billing period.</p>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-white border border-rose-300 text-rose-700 text-sm font-medium rounded-xl hover:bg-rose-50 transition"
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Before you cancel...</h3>
            <p className="text-sm text-slate-600 mb-5">
              Did you know you can buy invoice credits instead? No monthly commitment — pay once and use whenever you need.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setShowUpgradePopup(true); }}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
              >
                Buy Credits Instead
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
              >
                Keep My Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 font-medium text-sm hover:bg-rose-50 transition disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradePopup show={showUpgradePopup} onClose={() => setShowUpgradePopup(false)} />
    </main>
  );
}
