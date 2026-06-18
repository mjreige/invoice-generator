"use client";

import { useEffect, useState } from "react";
import { openCheckout } from "@/lib/paddle";
import { supabase } from "@/lib/supabaseClient";

interface UpgradePopupProps {
  show: boolean;
  onClose: () => void;
}

const PRICES = {
  pro: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || "pri_01kkshav4ehmnnwz4an3z07wes",
  business: process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID || "pri_01kkshe2hfk9jp508nyy8q081v",
  starter: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID || "pri_01km55j5sc439a0p5n2772egbp",
  proPack: process.env.NEXT_PUBLIC_PADDLE_PRO_PACK_PRICE_ID || "pri_01km55kskn8sv6ea8hrg940h1p",
  businessPack: process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PACK_PRICE_ID || "pri_01km55py4yxzgsgg13sec7h5z9",
};

export default function UpgradePopup({ show, onClose }: UpgradePopupProps) {
  const [user, setUser] = useState<any>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    if (!show) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [show, onClose]);

  const handleBuy = async (priceId: string, id: string) => {
    if (!user?.email) return;
    setLoadingId(id);
    try {
      await openCheckout(priceId, user.email, user.id, promoCode.trim() || undefined);
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoadingId(null);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 sm:p-8">

          {/* BUNDLES SECTION */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-slate-600" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Buy Invoice Credits</span>
              <div className="h-px flex-1 bg-slate-600" />
            </div>
            <p className="text-center text-sm text-slate-400 mb-1">One-time purchase · No subscription · Never expires</p>
            <p className="text-center text-xs text-slate-500 mb-5">Automation features (reminders, recurring invoices) require a monthly plan.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Starter */}
              <div className="bg-slate-700/50 rounded-xl border border-slate-600 p-5">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">Starter</h3>
                  <div className="text-3xl font-bold text-white mt-1">$4.99</div>
                  <div className="text-blue-400 font-semibold mt-1">10 invoices</div>
                  <div className="text-xs text-slate-400 mt-1">$0.50 per invoice</div>
                </div>
                <ul className="space-y-2 mb-5 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Basic invoice generation</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>PDF download</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Invoice history</li>
                </ul>
                <button
                  onClick={() => handleBuy(PRICES.starter, "starter")}
                  disabled={loadingId === "starter"}
                  className="w-full py-2.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold text-sm transition disabled:opacity-50"
                >
                  {loadingId === "starter" ? "Opening..." : "Buy Starter"}
                </button>
              </div>

              {/* Plus Pack */}
              <div className="relative bg-slate-700/50 rounded-xl border border-blue-500/50 ring-2 ring-blue-500/20 p-5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Best Value</span>
                </div>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">Plus Pack</h3>
                  <div className="text-3xl font-bold text-white mt-1">$9.99</div>
                  <div className="text-blue-400 font-semibold mt-1">25 invoices</div>
                  <div className="text-xs text-slate-400 mt-1">$0.40 per invoice</div>
                </div>
                <ul className="space-y-2 mb-5 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Everything in Starter</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Multi-currency invoicing (25+ currencies)</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Business profile & digital signature</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Tax support (rate + custom label)</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Line item templates & my customers</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Edit & re-download past invoices</li>
                </ul>
                <button
                  onClick={() => handleBuy(PRICES.proPack, "proPack")}
                  disabled={loadingId === "proPack"}
                  className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition disabled:opacity-50"
                >
                  {loadingId === "proPack" ? "Opening..." : "Buy Plus Pack"}
                </button>
              </div>

              {/* Max Pack */}
              <div className="bg-slate-700/50 rounded-xl border border-purple-500/30 p-5">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">Max Pack</h3>
                  <div className="text-3xl font-bold text-white mt-1">$19.99</div>
                  <div className="text-purple-400 font-semibold mt-1">50 invoices</div>
                  <div className="text-xs text-slate-400 mt-1">$0.40 per invoice</div>
                </div>
                <ul className="space-y-2 mb-5 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Everything in Plus Pack</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Arabic PDF support (RTL)</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Priority support</li>
                </ul>
                <button
                  onClick={() => handleBuy(PRICES.businessPack, "businessPack")}
                  disabled={loadingId === "businessPack"}
                  className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition disabled:opacity-50"
                >
                  {loadingId === "businessPack" ? "Opening..." : "Buy Max Pack"}
                </button>
              </div>
            </div>
          </div>

          {/* SUBSCRIPTION SECTION */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-slate-600" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Monthly Subscription</span>
              <div className="h-px flex-1 bg-slate-600" />
            </div>
            <p className="text-center text-sm text-slate-400 mb-5">Unlimited invoices · Cancel anytime</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Pro Monthly */}
              <div className="relative bg-slate-700/50 rounded-xl border border-blue-500/50 ring-2 ring-blue-500/20 p-5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Most Popular</span>
                </div>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">Pro</h3>
                  <div><span className="text-3xl font-bold text-white">$9</span><span className="text-slate-400">/month</span></div>
                </div>
                <ul className="space-y-2 mb-5 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Unlimited invoices</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Multi-currency invoicing (25+ currencies)</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Business profile & digital signature</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Tax support (rate + custom label)</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Line item templates & my customers</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Edit & re-download past invoices</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Automatic payment reminders</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Priority email support</li>
                </ul>
                <button
                  onClick={() => handleBuy(PRICES.pro, "pro")}
                  disabled={loadingId === "pro"}
                  className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition disabled:opacity-50"
                >
                  {loadingId === "pro" ? "Opening..." : "Subscribe to Pro"}
                </button>
              </div>

              {/* Business Monthly */}
              <div className="bg-slate-700/50 rounded-xl border border-purple-500/30 p-5">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">Business</h3>
                  <div><span className="text-3xl font-bold text-white">$15</span><span className="text-slate-400">/month</span></div>
                </div>
                <ul className="space-y-2 mb-5 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Everything in Pro</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Arabic PDF support (RTL text rendering)</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Custom invoice numbering templates</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span>Priority customer support</li>
                </ul>
                <button
                  onClick={() => handleBuy(PRICES.business, "business")}
                  disabled={loadingId === "business"}
                  className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition disabled:opacity-50"
                >
                  {loadingId === "business" ? "Opening..." : "Subscribe to Business"}
                </button>
              </div>
            </div>
          </div>

          {/* Promo code */}
          <div className="mb-4 flex flex-col items-center gap-2">
            <div className="flex w-full max-w-sm items-center gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
                placeholder="Promo code"
                className="h-10 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => { if (promoCode.trim()) setPromoApplied(true); }}
                className="h-10 rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white transition hover:bg-slate-600"
              >Apply</button>
            </div>
            {promoApplied && promoCode && (
              <p className="text-xs text-green-400 font-medium">✓ Code "{promoCode}" will be applied at checkout</p>
            )}
          </div>

          <div className="text-center">
            <button onClick={onClose} className="text-slate-400 hover:text-white transition text-sm">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
