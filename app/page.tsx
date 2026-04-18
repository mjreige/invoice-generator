"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import UpgradePopup from "@/components/UpgradePopup";

function LandingPageInner() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomePlan, setWelcomePlan] = useState<"pro" | "business" | "credits">("pro");
  const { canGenerateInvoice, invoiceCount, isActive, hasCredits, loading } = useSubscription();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(user));
    };
    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Show welcome modal after purchase
  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      const plan = searchParams.get("plan");
      setWelcomePlan(plan === "business" ? "business" : plan === "credits" ? "credits" : "pro");
      setShowWelcome(true);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  const handleGenerateClick = () => {
    if (!isLoggedIn) {
      window.location.href = "/login?redirect=/invoice";
      return;
    }
    if (!loading && !canGenerateInvoice) {
      setShowUpgrade(true);
      return;
    }
    window.location.href = "/invoice";
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
      description: "5 free invoices to start, then buy credit packs or subscribe monthly — no pressure",
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
      badge: "Business"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "Business Profile",
      description: "Add your business details and custom branding to every invoice",
      badge: "Pro & Business"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      title: "Digital Signature",
      description: "Add professional digital signatures to your invoices",
      badge: "Pro & Business"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Invoice History & Editing",
      description: "Track all your invoices and edit any past invoice to re-download an updated PDF",
      badge: "All Plans"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      title: "Saved Line Items",
      description: "Save your most-used services with preset prices — they auto-fill when creating new invoices",
      badge: "Pro & Business"
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
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <main className="min-h-[calc(100vh-56px)] bg-slate-950 px-4 py-12 text-slate-900">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-3xl border border-white/10 bg-white/95 px-6 py-10 shadow-2xl shadow-black/40 backdrop-blur sm:px-10">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Generate polished invoices in minutes
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Fill out your details, add line items, apply a discount, and export a clean PDF invoice. Start free — no credit card needed.
            </p>

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
                  <div className="inline-flex items-center gap-2 text-sm text-amber-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Invoice credits active
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

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleGenerateClick}
                className="flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 active:translate-y-px"
              >
                Generate Invoice
              </button>
              <a
                href={historyHref}
                className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:translate-y-px"
              >
                View Invoice History
              </a>
            </div>
            {isLoggedIn && (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <a href="/units" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                  </svg>
                  Manage Preset Units
                </a>
                <a href="/saved-items" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Saved Line Items
                </a>
                <a href="/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Customers
                </a>
              </div>
            )}
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
              {[
                { name: "FREE", price: "$0", desc: "Get started", features: ["5 invoices total", "PDF download", "Invoice history"] },
                { name: "CREDIT PACKS", price: "From $4.99", desc: "Pay once, use anytime", features: ["10, 25, or 50 invoices", "Never expires", "Pro features included"], popular: true },
                { name: "MONTHLY", price: "From $7/mo", desc: "For frequent users", features: ["Unlimited invoices", "Business profile", "Arabic support on Business"] },
              ].map((plan, i) => (
                <div key={i} className={`bg-slate-800/50 rounded-xl border ${plan.popular ? "border-blue-500/50 ring-2 ring-blue-500/20" : "border-slate-700/50"} p-6 relative`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Best Value</span>
                    </div>
                  )}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-2xl font-bold text-white mt-1">{plan.price}</p>
                    <p className="text-slate-400 text-sm">{plan.desc}</p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-300 text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
                ? ["Unlimited invoice generation until credits run out", "Business profile & branding", "Digital signature", "Invoice history & editing", "Saved line items"]
                : welcomePlan === "pro"
                ? ["Unlimited invoices", "Business profile & branding", "Digital signature", "Invoice editing", "Saved line items (auto-fill when creating)"]
                : ["Everything in Pro", "Arabic PDF support (RTL)", "Priority support", "Saved line items (auto-fill when creating)"]
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
                  Set up Saved Line Items →
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
