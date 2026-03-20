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
  const { plan: currentPlan } = useSubscription();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const proPriceId =
    process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID ||
    "pri_01kkshav4ehmnnwz4an3z07wes";
  const businessPriceId =
    process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID ||
    "pri_01kkshe2hfk9jp508nyy8q081v";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleSubscribe = async (priceId: string) => {
    if (!user?.email) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setLoading(true);
    try {
      await openCheckout(priceId, user.email, user.id);
    } catch (error) {
      console.error("Error opening checkout:", error);
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      question: "Can I cancel anytime?",
      answer:
        "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period, and you won't be charged again.",
    },
    {
      question: "What happens when I hit 5 free invoices?",
      answer:
        "When you reach the 5 invoice limit on the free plan, you'll need to upgrade to a paid plan to continue creating invoices.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely! We use industry-standard encryption to protect your data. All invoices and business information are stored securely and never shared with third parties.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "We offer a 30-day refund policy. If you are not satisfied within 30 days of purchase, contact us at app.invoicegenerator@gmail.com for a full refund, no questions asked.",
    },
  ];

  const renderButton = (planName: "PRO" | "BUSINESS") => {
    const priceId = planName === "PRO" ? proPriceId : businessPriceId;
    const isCurrentPlan =
      (planName === "PRO" && currentPlan === "pro") ||
      (planName === "BUSINESS" && currentPlan === "business");

    const isLowerPlan =
      planName === "PRO" && currentPlan === "business";

    if (isCurrentPlan) {
      return (
        <div className="text-center">
          <span className="inline-block mb-3 px-3 py-1 text-xs font-semibold bg-green-500 text-white rounded-full">
            Current Plan
          </span>
          <div className="w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-600 text-slate-300 cursor-not-allowed">
            Active
          </div>
        </div>
      );
    }

    if (isLowerPlan) {
      return (
        <div className="w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-600 text-slate-400 cursor-not-allowed">
          Included in Business
        </div>
      );
    }

    if (!user) {
      return (
        <Link
          href="/login?redirect=/pricing"
          className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-blue-500 hover:bg-blue-600 text-white transition-colors"
        >
          Get Started
        </Link>
      );
    }

    return (
      <button
        onClick={() => handleSubscribe(priceId)}
        disabled={loading}
        className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? "Loading..." : planName === "PRO" && currentPlan === "free" ? "Upgrade to Pro" : "Upgrade to Business"}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Choose the perfect plan for your business. Start free and upgrade as
            you grow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {/* FREE PLAN */}
          <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">FREE</h3>
              <div className="mb-2">
                <span className="text-4xl font-bold text-white">$0</span>
              </div>
              <p className="text-slate-300">Perfect for getting started</p>
            </div>
            <ul className="space-y-4 mb-8">
              {[
                "Up to 5 invoices total",
                "Basic invoice generation",
                "PDF download",
                "Invoice history",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{f}</span>
                </li>
              ))}
            </ul>
            {currentPlan === "free" ? (
              <div className="text-center">
                <span className="inline-block mb-3 px-3 py-1 text-xs font-semibold bg-green-500 text-white rounded-full">
                  Current Plan
                </span>
                <div className="w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-600 text-slate-300 cursor-not-allowed">
                  Active
                </div>
              </div>
            ) : !user ? (
              <Link
                href="/signup"
                className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                Get Started Free
              </Link>
            ) : null}
          </div>

          {/* PRO PLAN */}
          <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-500/50 ring-2 ring-blue-500/20 p-8">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Star className="w-4 h-4" />
                Most Popular
              </div>
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">PRO</h3>
              <div className="mb-2">
                <span className="text-4xl font-bold text-white">$7</span>
                <span className="text-slate-400">/month</span>
              </div>
              <p className="text-slate-300">Most popular for freelancers</p>
            </div>
            <ul className="space-y-4 mb-8">
              {[
                "Unlimited invoices",
                "Business profile with logo",
                "Digital signature support",
                "Invoice history",
                "Sorting and pagination",
                "Priority email support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{f}</span>
                </li>
              ))}
            </ul>
            {renderButton("PRO")}
          </div>

          {/* BUSINESS PLAN */}
          <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">BUSINESS</h3>
              <div className="mb-2">
                <span className="text-4xl font-bold text-white">$12</span>
                <span className="text-slate-400">/month</span>
              </div>
              <p className="text-slate-300">Perfect for growing businesses</p>
            </div>
            <ul className="space-y-4 mb-8">
              {[
                "Everything in Pro",
                "Arabic language support",
                "Priority customer support",
                "Advanced customization",
                "Team collaboration (coming soon)",
                "API access (coming soon)",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{f}</span>
                </li>
              ))}
            </ul>
            {renderButton("BUSINESS")}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-300">Got questions? We have answers.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50"
              >
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <span className="text-white font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      expandedFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-slate-300">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 bg-slate-900/50 backdrop-blur mt-16">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Invoice Generator. All rights
              reserved.
            </p>
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
