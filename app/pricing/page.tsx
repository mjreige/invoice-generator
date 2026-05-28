"use client";

import Link from "next/link";
import { ArrowLeft, Check, Star, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { openCheckout } from "@/lib/paddle";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import { useRouter } from "next/navigation";

export default function Pricing() {
  const router = useRouter();
  const { plan: currentPlan, isActive, hasCredits } = useSubscription();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const PRICES = {
    pro: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || "pri_01kkshav4ehmnnwz4an3z07wes",
    business: process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID || "pri_01kkshe2hfk9jp508nyy8q081v",
    proYearly: process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID || "pri_01kmynz4249ptch5zbyqsr1bfz",
    businessYearly: process.env.NEXT_PUBLIC_PADDLE_BUSINESS_YEARLY_PRICE_ID || "pri_01kmyp16vek5zsqjrx6fbhtdnd",
    starter: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID || "pri_01km55j5sc439a0p5n2772egbp",
    proPack: process.env.NEXT_PUBLIC_PADDLE_PRO_PACK_PRICE_ID || "pri_01km55kskn8sv6ea8hrg940h1p",
    businessPack: process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PACK_PRICE_ID || "pri_01km55py4yxzgsgg13sec7h5z9",
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleBuy = async (priceId: string, id: string) => {
    if (!user?.email) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setLoadingId(id);
    try {
      await openCheckout(priceId, user.email, user.id, promoCode.trim() || undefined);
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoadingId(null);
    }
  };

  const faqs = [
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
    },
    {
      question: "Do credit packs expire?",
      answer: "No — invoice credits never expire. Buy once and use whenever you need.",
    },
    {
      question: "What happens when I hit 5 free invoices?",
      answer: "You can buy a credit pack (one-time) or subscribe monthly to continue creating invoices.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use industry-standard encryption and never share your data with third parties.",
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 30-day refund policy. Contact us at sales@ncgmgroup.com for a full refund, no questions asked.",
    },
  ];

  const renderSubscribeButton = (planName: "PRO" | "BUSINESS") => {
    const id = planName === "PRO" ? (annual ? "proYearly" : "pro") : (annual ? "businessYearly" : "business");
    const priceId = planName === "PRO"
      ? (annual ? PRICES.proYearly : PRICES.pro)
      : (annual ? PRICES.businessYearly : PRICES.business);
    const isCurrentPlan = (planName === "PRO" && currentPlan === "pro") || (planName === "BUSINESS" && currentPlan === "business");
    const isLower = planName === "PRO" && currentPlan === "business";

    if (isCurrentPlan && isActive) {
      return (
        <div className="text-center">
          <span className="inline-block mb-3 px-3 py-1 text-xs font-semibold bg-green-500 text-white rounded-full">Current Plan</span>
          <div className="w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-600 text-slate-300 cursor-not-allowed">Active</div>
        </div>
      );
    }
    if (isLower) {
      return <div className="w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-600 text-slate-400 cursor-not-allowed">Included in Business</div>;
    }
    if (!user) {
      return <Link href="/login?redirect=/pricing" className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-blue-500 hover:bg-blue-600 text-white transition-colors">Get Started</Link>;
    }
    return (
      <button
        onClick={() => handleBuy(priceId, id)}
        disabled={loadingId === id}
        className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loadingId === id ? "Loading..." : planName === "PRO" ? "Subscribe to Pro" : "Subscribe to Business"}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />Back to Home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto">
            Start free. Buy credits when you need them, or subscribe for unlimited access.
          </p>
        </div>

        {/* PROMO CODE — top of page */}
        {user && (
          <div className="mb-12 flex flex-col items-center gap-2">
            <div className="flex w-full max-w-sm items-center gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
                placeholder="Have a promo code?"
                className="h-10 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => { if (promoCode.trim()) setPromoApplied(true); }}
                className="h-10 rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white transition hover:bg-slate-600"
              >
                Apply
              </button>
            </div>
            {promoApplied && promoCode && (
              <p className="text-xs text-green-400 font-medium">✓ Code "{promoCode}" will be applied at checkout</p>
            )}
          </div>
        )}

        {/* CREDIT PACKS */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Pay As You Go</h2>
            <p className="text-slate-400 mt-2">One-time purchase · No subscription · Never expires</p>
            <p className="text-slate-500 text-xs mt-2">Automation features (reminders, recurring invoices) require a monthly plan.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white">Starter</h3>
                <div className="mt-2"><span className="text-3xl font-bold text-white">$4.99</span></div>
                <div className="text-blue-400 font-semibold mt-1">10 invoices</div>
                <div className="text-xs text-slate-400">$0.50 per invoice</div>
              </div>
              <ul className="space-y-3 mb-6">
                {["Basic invoice generation", "PDF download", "Invoice history"].map(f => (
                  <li key={f} className="flex items-start gap-3"><Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /><span className="text-slate-300 text-sm">{f}</span></li>
                ))}
              </ul>
              {!user ? (
                <Link href="/login?redirect=/pricing" className="block w-full py-2.5 rounded-lg font-semibold text-center bg-slate-700 hover:bg-slate-600 text-white transition-colors text-sm">Get Started</Link>
              ) : (
                <button onClick={() => handleBuy(PRICES.starter, "starter")} disabled={loadingId === "starter"} className="block w-full py-2.5 rounded-lg font-semibold text-center bg-slate-600 hover:bg-slate-500 text-white transition-colors text-sm disabled:opacity-70">
                  {loadingId === "starter" ? "Loading..." : "Buy Starter Pack"}
                </button>
              )}
            </div>

            {/* Plus Pack */}
            <div className="relative bg-slate-800/50 rounded-2xl border border-blue-500/50 ring-2 ring-blue-500/20 p-6">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4" />Best Value
                </div>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white">Plus Pack</h3>
                <div className="mt-2"><span className="text-3xl font-bold text-white">$9.99</span></div>
                <div className="text-blue-400 font-semibold mt-1">25 invoices</div>
                <div className="text-xs text-slate-400">$0.40 per invoice</div>
              </div>
              <ul className="space-y-3 mb-6">
                {["Everything in Starter", "Multi-currency invoicing (25+ currencies)", "Business profile & digital signature", "Tax support (rate + custom label)", "Line item templates & my customers", "Edit & re-download past invoices", "Billable item units"].map(f => (
                  <li key={f} className="flex items-start gap-3"><Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /><span className="text-slate-300 text-sm">{f}</span></li>
                ))}
              </ul>
              {!user ? (
                <Link href="/login?redirect=/pricing" className="block w-full py-2.5 rounded-lg font-semibold text-center bg-blue-500 hover:bg-blue-600 text-white transition-colors text-sm">Get Started</Link>
              ) : (
                <button onClick={() => handleBuy(PRICES.proPack, "proPack")} disabled={loadingId === "proPack"} className="block w-full py-2.5 rounded-lg font-semibold text-center bg-blue-500 hover:bg-blue-600 text-white transition-colors text-sm disabled:opacity-70">
                  {loadingId === "proPack" ? "Loading..." : "Buy Plus Pack"}
                </button>
              )}
            </div>

            {/* Max Pack */}
            <div className="bg-slate-800/50 rounded-2xl border border-purple-500/30 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white">Max Pack</h3>
                <div className="mt-2"><span className="text-3xl font-bold text-white">$19.99</span></div>
                <div className="text-purple-400 font-semibold mt-1">50 invoices</div>
                <div className="text-xs text-slate-400">$0.40 per invoice</div>
              </div>
              <ul className="space-y-3 mb-6">
                {["Everything in Plus Pack", "Arabic PDF support (RTL text rendering)", "Priority support"].map(f => (
                  <li key={f} className="flex items-start gap-3"><Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /><span className="text-slate-300 text-sm">{f}</span></li>
                ))}
              </ul>
              {!user ? (
                <Link href="/login?redirect=/pricing" className="block w-full py-2.5 rounded-lg font-semibold text-center bg-purple-600 hover:bg-purple-700 text-white transition-colors text-sm">Get Started</Link>
              ) : (
                <button onClick={() => handleBuy(PRICES.businessPack, "businessPack")} disabled={loadingId === "businessPack"} className="block w-full py-2.5 rounded-lg font-semibold text-center bg-purple-600 hover:bg-purple-700 text-white transition-colors text-sm disabled:opacity-70">
                  {loadingId === "businessPack" ? "Loading..." : "Buy Max Pack"}
                </button>
              )}
            </div>
          </div>
        </div>


        {/* FREE PLAN */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Free Plan</h2>
            <p className="text-slate-400 mt-2">No credit card required · Get started instantly</p>
          </div>
          <div className="max-w-sm mx-auto">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">FREE</h3>
                <span className="text-4xl font-bold text-white">$0</span>
                <p className="text-slate-300 mt-2">Perfect for getting started</p>
              </div>
              <ul className="space-y-4 mb-8">
                {["Up to 5 invoices total", "Basic invoice generation", "PDF download", "Invoice history"].map(f => (
                  <li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" /><span className="text-slate-300">{f}</span></li>
                ))}
              </ul>
              {currentPlan === "free" && !hasCredits ? (
                <div className="text-center">
                  <span className="inline-block mb-3 px-3 py-1 text-xs font-semibold bg-green-500 text-white rounded-full">Current Plan</span>
                  <div className="w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-600 text-slate-300 cursor-not-allowed">Active</div>
                </div>
              ) : !user ? (
                <Link href="/signup" className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-700 hover:bg-slate-600 text-white transition-colors">Get Started Free</Link>
              ) : null}
            </div>
          </div>
        </div>

        {/* SUBSCRIPTIONS */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Unlimited Access</h2>
            <p className="text-slate-400 mt-2">Unlimited invoices · Cancel anytime</p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <span className={`text-sm font-medium ${!annual ? "text-white" : "text-slate-400"}`}>Monthly</span>
              <button
                type="button"
                onClick={() => setAnnual(!annual)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${annual ? "bg-green-500" : "bg-slate-600"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${annual ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className={`text-sm font-medium ${annual ? "text-white" : "text-slate-400"}`}>
                Annual
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full">2 months free</span>
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">

            {/* PRO */}
            <div className="relative bg-slate-800/50 rounded-2xl border border-blue-500/50 ring-2 ring-blue-500/20 p-8">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4" />Most Popular
                </div>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">PRO</h3>
                {annual ? (
                  <div>
                    <span className="text-4xl font-bold text-white">$89</span>
                    <span className="text-slate-400">/year</span>
                    <div className="text-xs text-green-400 font-medium mt-1">$7.42/month · 2 months free</div>
                  </div>
                ) : (
                  <div><span className="text-4xl font-bold text-white">$9</span><span className="text-slate-400">/month</span></div>
                )}
                <p className="text-slate-300 mt-2">For freelancers</p>
              </div>
              <ul className="space-y-4 mb-8">
                {["Unlimited invoices", "Multi-currency invoicing (25+ currencies)", "Business profile & digital signature", "Tax support (rate + custom label)", "Line item templates & my customers", "Edit & re-download past invoices", "Billable item units", "Automatic payment reminders (before & after due date)", "Priority email support"].map(f => (
                  <li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" /><span className="text-slate-300">{f}</span></li>
                ))}
              </ul>
              {renderSubscribeButton("PRO")}
            </div>

            {/* BUSINESS */}
            <div className="bg-slate-800/50 rounded-2xl border border-purple-500/30 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">BUSINESS</h3>
                {annual ? (
                  <div>
                    <span className="text-4xl font-bold text-purple-400">$149</span>
                    <span className="text-slate-400">/year</span>
                    <div className="text-xs text-green-400 font-medium mt-1">$12.42/month · 2 months free</div>
                  </div>
                ) : (
                  <div><span className="text-4xl font-bold text-purple-400">$15</span><span className="text-slate-400">/month</span></div>
                )}
                <p className="text-slate-300 mt-2">For growing businesses</p>
              </div>
              <ul className="space-y-4 mb-8">
                {["Everything in Pro", "Arabic PDF support (RTL text rendering)", "Priority customer support"].map(f => (
                  <li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" /><span className="text-slate-300">{f}</span></li>
                ))}
              </ul>
              {renderSubscribeButton("BUSINESS")}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-300">Got questions? We have answers.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg border border-slate-700/50">
                <button onClick={() => setExpandedFaq(expandedFaq === index ? null : index)} className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                  <span className="text-white font-medium">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedFaq === index ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === index && <div className="px-6 pb-4"><p className="text-slate-300">{faq.answer}</p></div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 bg-slate-900/50 backdrop-blur mt-16">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">© {new Date().getFullYear()} Invoice Generator. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</a>
              <a href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
