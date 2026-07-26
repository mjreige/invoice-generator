"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import { openCheckout } from "@/lib/paddle";
import UpgradePopup from "@/components/UpgradePopup";
import GuideMePopup from "@/components/GuideMePopup";

const HOME_PRICES = {
  proPack: process.env.NEXT_PUBLIC_PADDLE_PRO_PACK_PRICE_ID || "pri_01km55kskn8sv6ea8hrg940h1p",
  pro: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || "pri_01kkshav4ehmnnwz4an3z07wes",
  business: process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID || "pri_01kkshe2hfk9jp508nyy8q081v",
};

// ── Launch-week config ─────────────────────────────────────────────
// Flip `enabled` to true for launch week, then back to false when the offer ends.
// `promoCode` must match the capped discount you create in Paddle.
// `productHuntUrl` / `productHuntBadgeId`: fill in after your PH listing is live
// (badge id is the number in the "featured" badge embed Product Hunt gives you).
const LAUNCH = {
  enabled: false,
  promoCode: "LAUNCH30",
  bannerText: "Launch week: 30% off your first purchase with code",
  ctaText: "See plans",
  productHuntUrl: "", // e.g. "https://www.producthunt.com/posts/invoice-generator"
  productHuntBadgeId: "", // e.g. "123456"
};

function LandingPageInner() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pricingLoadingId, setPricingLoadingId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [welcomePlan, setWelcomePlan] = useState<"pro" | "business" | "credits">("pro");
  const [launchBannerDismissed, setLaunchBannerDismissed] = useState(true);
  const { canGenerateInvoice, invoiceCount, isActive, hasCredits, effectivePlan, packType, loading, refresh } = useSubscription();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(user));
      setCurrentUser(user ?? null);
      // Auto-show guide for new users (set by signup page)
      if (user && typeof window !== "undefined" && localStorage.getItem("show_guide") === "true") {
        localStorage.removeItem("show_guide");
        setShowGuide(true);
      }
      // Launch banner: show unless the user dismissed it this launch cycle.
      if (typeof window !== "undefined" && LAUNCH.enabled) {
        setLaunchBannerDismissed(localStorage.getItem("launch_banner_dismissed") === LAUNCH.promoCode);
      }
    };
    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Also open guide from ?guide=true URL param (avatar link)
  useEffect(() => {
    if (searchParams.get("guide") === "true") {
      setShowGuide(true);
      router.replace("/", { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Show welcome modal after purchase and refresh subscription data
  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      const plan = searchParams.get("plan");
      setWelcomePlan(plan === "business" ? "business" : plan === "credits" ? "credits" : "pro");
      setShowWelcome(true);
      router.replace("/", { scroll: false });
      // Refresh once immediately and again after a delay in case the
      // Paddle webhook needed extra time to update the database
      refresh();
      const t = setTimeout(() => refresh(), 3000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleGenerateClick = () => {
    if (!isLoggedIn) {
      window.location.href = "/login?redirect=/invoice";
      return;
    }
    // Soft wall: always let them into the form; upgrade prompt shows at confirm step
    window.location.href = "/invoice";
  };

  const handlePricingBuy = async (priceId: string, id: string) => {
    if (!currentUser?.email) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setPricingLoadingId(id);
    try {
      await openCheckout(priceId, currentUser.email, currentUser.id);
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setPricingLoadingId(null);
    }
  };

  const historyHref = isLoggedIn ? "/history" : "/login?redirect=/history";

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Invoices Your Way",
      description: "5 free invoices to start, then buy pay-as-you-go packs or subscribe monthly — no pressure",
      badge: "All Plans"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
      title: "Arabic Language Support",
      description: "Full Arabic language support with RTL text rendering in PDF",
      badge: "Max Pack & Business"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "My Profile",
      description: "Add your business details and custom branding to every invoice",
      badge: "Plus Pack & above"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      title: "Digital Signature",
      description: "Add professional digital signatures to your invoices",
      badge: "Plus Pack & above"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "My Invoices",
      description: "Track all your invoices in one place. Plus Pack and above users can also edit and re-download any past invoice as an updated PDF",
      badge: "View: All Plans · Edit: Plus Pack & above"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Excel Export",
      description: "Export your invoices to a spreadsheet — filter by customer or date range, then download invoice number, customer, date, total and currency for your books",
      badge: "Plus Pack & above"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      title: "Line Item Templates",
      description: "Save your most-used services with preset prices — they auto-fill when creating new invoices",
      badge: "Plus Pack & above"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "My Customers",
      description: "Save client details and have them auto-fill on new invoices — name, address, email, phone, tax ID",
      badge: "Plus Pack & above"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: "Tax & Discounts",
      description: "Apply percentage or fixed discounts, and configure tax rate with a custom label on every invoice",
      badge: "Tax: Plus Pack & above · Discounts: All Plans"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: "PDF Export",
      description: "Download professional PDF invoices ready to send to clients",
      badge: "All Plans"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 9l3-1m-3 1l-3-9m3 9l-6 2m0-2l3-9m0 0L9 5m6 2l-3-1" />
        </svg>
      ),
      title: "Multi-Currency",
      description: "Invoice in 25+ currencies — USD, EUR, GBP, AED, LBP, and more. Set a default currency in your profile",
      badge: "Plus Pack & above"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      title: "Custom Units",
      description: "Define your own billable units — hours, days, words, sessions, or anything your business uses",
      badge: "Plus Pack & above"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      title: "Payment Reminders",
      description: "Set your default reminder timing in your profile — every invoice pre-fills automatically. Send before and after the due date with zero manual follow-up",
      badge: "Pro & Business"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 11h4m-4 4h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: "Custom Invoice Numbering",
      description: "Define your own numbering format — e.g. ACME-2026-0001 — with a live preview, automatic yearly reset, and an option to lock it from manual edits",
      badge: "Business"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {LAUNCH.enabled && !launchBannerDismissed && (
        <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-center text-sm text-white">
          <span>
            🚀 {LAUNCH.bannerText}{" "}
            <span className="font-bold tracking-wide">{LAUNCH.promoCode}</span>
          </span>
          <a
            href="/pricing"
            className="hidden rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25 sm:inline-block"
          >
            {LAUNCH.ctaText}
          </a>
          <button
            aria-label="Dismiss"
            onClick={() => {
              setLaunchBannerDismissed(true);
              if (typeof window !== "undefined") localStorage.setItem("launch_banner_dismissed", LAUNCH.promoCode);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      <main className="min-h-[calc(100vh-56px)] bg-slate-950 px-4 py-12 text-slate-900">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-3xl border border-white/10 bg-white/95 px-6 py-10 shadow-2xl shadow-black/40 backdrop-blur sm:px-10">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Generate polished invoices in minutes
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Fill out your details, add line items, apply a discount, and export a clean PDF invoice. Start free — no credit card needed.
            </p>

            {LAUNCH.enabled && LAUNCH.productHuntUrl && LAUNCH.productHuntBadgeId && (
              <a
                href={LAUNCH.productHuntUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${LAUNCH.productHuntBadgeId}&theme=light`}
                  alt="Featured on Product Hunt"
                  width={200}
                  height={43}
                />
              </a>
            )}

            {/* Usage indicator for logged in users */}
            {isLoggedIn && !loading && (
              <div className="mt-4">
                {isActive && (
                  <div className="inline-flex items-center gap-2 text-sm text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    Active subscription — unlimited invoices
                  </div>
                )}
                {!isActive && hasCredits && (
                  <div className={`inline-flex items-center gap-2 text-sm ${packType === "business_pack" ? "text-purple-400" : packType === "pro_pack" ? "text-blue-400" : "text-amber-600"}`}>
                    <span className={`w-2 h-2 rounded-full inline-block ${packType === "business_pack" ? "bg-purple-500" : packType === "pro_pack" ? "bg-blue-500" : "bg-amber-500"}`} />
                    {packType === "business_pack" ? "Max Pack" : packType === "pro_pack" ? "Plus Pack" : "Starter Pack"} credits active
                  </div>
                )}
                {!isActive && !hasCredits && invoiceCount >= 5 && (
                  <div className="inline-flex items-center gap-2 text-sm text-red-600">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    Free limit reached — upgrade to continue
                  </div>
                )}
                {!isActive && !hasCredits && invoiceCount < 5 && (
                  <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    {5 - invoiceCount} free invoice{5 - invoiceCount !== 1 ? "s" : ""} remaining
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col items-start gap-3">
              <button
                onClick={handleGenerateClick}
                className="flex h-14 w-full sm:w-auto items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px"
              >
                Generate Invoice
              </button>
              {isLoggedIn && (
                <a href={historyHref} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                  View my invoices →
                </a>
              )}
              <button
                onClick={() => setShowGuide(true)}
                className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Guide Me
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Everything you need to invoice professionally
              </h2>
              <p className="mt-4 text-lg text-slate-300">
                Powerful features designed for freelancers and businesses
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:bg-slate-800/70 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">{feature.icon}</div>
                    <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">{feature.badge}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-300 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing summary */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Simple, flexible pricing</h2>
              <p className="mt-4 text-lg text-slate-300">Pay only for what you need — no forced subscriptions</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* FREE */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 flex flex-col">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">FREE</h3>
                  <p className="text-2xl font-bold text-white mt-1">$0</p>
                  <p className="text-slate-400 text-sm">Get started</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {["5 invoices total", "PDF download", "My Invoices", "Discounts & line item units"].map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-slate-300 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                {!isLoggedIn ? (
                  <a href="/signup" className="block w-full py-2.5 rounded-lg font-semibold text-center bg-slate-700 hover:bg-slate-600 text-white transition-colors text-sm">Get Started Free</a>
                ) : (
                  <div className="w-full py-2.5 rounded-lg font-semibold text-center bg-slate-700/50 text-slate-400 text-sm cursor-default">Currently Active</div>
                )}
              </div>

              {/* CREDIT PACKS */}
              <div className="relative bg-slate-800/50 rounded-xl border border-blue-500/50 ring-2 ring-blue-500/20 p-6 flex flex-col">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Best Value</span>
                </div>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">PAY AS YOU GO</h3>
                  <p className="text-2xl font-bold text-white mt-1">From $4.99</p>
                  <p className="text-slate-400 text-sm">Pay once, never expires</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {["Starter $4.99 · 10 invoices (basic)", "Plus Pack $9.99 · 25 invoices + pro features", "Max Pack $19.99 · 50 invoices + all features"].map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-slate-300 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePricingBuy(HOME_PRICES.proPack, "proPack")}
                  disabled={pricingLoadingId === "proPack"}
                  className="block w-full py-2.5 rounded-lg font-semibold text-center bg-blue-500 hover:bg-blue-600 text-white transition-colors text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {pricingLoadingId === "proPack" ? "Loading..." : "Buy Plus Pack — $9.99"}
                </button>
                <a href="/pricing" className="block text-center text-xs text-slate-400 hover:text-slate-300 mt-2 transition-colors">See all packs →</a>
              </div>

              {/* MONTHLY */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 flex flex-col">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">MONTHLY</h3>
                  <p className="text-2xl font-bold text-white mt-1">From $9/mo</p>
                  <p className="text-slate-400 text-sm">Unlimited invoices</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {["Pro $9/mo · unlimited + payment reminders", "Business $15/mo · Arabic PDF + custom invoice numbering", "Cancel anytime"].map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-slate-300 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                {isActive ? (
                  <div className="w-full py-2.5 rounded-lg font-semibold text-center bg-slate-600 text-slate-300 text-sm cursor-not-allowed">Active Subscription</div>
                ) : (
                  <button
                    onClick={() => handlePricingBuy(HOME_PRICES.pro, "proMonthly")}
                    disabled={pricingLoadingId === "proMonthly"}
                    className="block w-full py-2.5 rounded-lg font-semibold text-center bg-slate-700 hover:bg-slate-600 text-white transition-colors text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {pricingLoadingId === "proMonthly" ? "Loading..." : "Subscribe to Pro — $9/mo"}
                  </button>
                )}
                <a href="/pricing" className="block text-center text-xs text-slate-400 hover:text-slate-300 mt-2 transition-colors">Compare all plans →</a>
              </div>
            </div>
            <div className="text-center">
              <a href="/pricing" className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
                See full pricing →
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/50 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">© {new Date().getFullYear()} Invoice Generator. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <a href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
              <a href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</a>
              <a href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>

      <UpgradePopup show={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <GuideMePopup show={showGuide} onClose={() => setShowGuide(false)} />

      {/* Welcome modal after purchase */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWelcome(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${welcomePlan === "business" ? "bg-purple-100" : "bg-blue-100"}`}>
              <svg className={`w-8 h-8 ${welcomePlan === "business" ? "text-purple-600" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1 text-center">
              {welcomePlan === "business" ? "Welcome to Business! 🎉" : welcomePlan === "credits" ? "Credits Added! 🎉" : "Welcome to Pro! 🎉"}
            </h2>
            <p className="text-slate-500 text-sm text-center mb-5">Here's what you now have access to:</p>
            <ul className="space-y-2 mb-6">
              {(welcomePlan === "credits"
                ? ["10 invoices — never expire", "PDF download & my invoices", "Discounts (% or fixed)", "Line item units"]
                : welcomePlan === "pro"
                ? ["Unlimited invoices", "My profile & branding", "Digital signature", "Tax support (rate + custom label)", "My customers with autocomplete", "Line item templates with autocomplete", "Edit & re-download past invoices", "Export invoices to Excel", "Line item units", "Priority email support"]
                : ["Everything in Pro", "Arabic PDF support (RTL text rendering)", "Custom invoice numbering templates", "My customers list", "Priority customer support"]
              ).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${welcomePlan === "business" ? "text-purple-500" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowWelcome(false); router.push("/invoice"); }}
                className={`w-full py-3 rounded-xl text-white font-semibold transition hover:brightness-105 ${welcomePlan === "business" ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}
              >
                Generate an Invoice
              </button>
              {(welcomePlan === "pro" || welcomePlan === "business") && (
                <button
                  onClick={() => { setShowWelcome(false); router.push("/saved-items"); }}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Set up Line Item Templates →
                </button>
              )}
              <button
                onClick={() => setShowWelcome(false)}
                className="w-full py-2 text-slate-400 text-sm hover:text-slate-600 transition"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense>
      <LandingPageInner />
    </Suspense>
  );
}
