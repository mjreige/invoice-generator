"use client";

import Link from "next/link";
import { ArrowLeft, Check, Star, HelpCircle, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { openCheckout } from "@/lib/paddle";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Pricing() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const proPriceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || 'pri_01kkshav4ehmnnwz4an3z07wes';
  const businessPriceId = process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID || 'pri_01kkshe2hfk9jp508nyy8q081v';

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    loadUser();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    console.log('DEBUG pricing page - handleSubscribe called with priceId:', priceId);
    console.log('DEBUG pricing page - user:', user);
    
    console.log('DEBUG pricing page - proPriceId:', proPriceId);
    console.log('DEBUG pricing page - businessPriceId:', businessPriceId);
    
    if (!user?.email) {
      console.log('DEBUG pricing page - no user, redirecting to login');
      router.push('/login?redirect=/pricing');
      return;
    }

    console.log('DEBUG pricing page - calling openCheckout with:', {
      priceId,
      userEmail: user.email,
      userId: user.id
    });

    setLoading(true);
    try {
      await openCheckout(priceId, user.email, user.id);
    } catch (error) {
      console.error('Error opening checkout:', error);
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: "FREE",
      price: "$0",
      period: "",
      description: "Perfect for getting started",
      features: [
        "Create up to 5 invoices total",
        "Basic invoice generation",
        "PDF download",
        "Invoice history",
      ],
      buttonText: "Get Started Free",
      buttonLink: "/signup",
      popular: false,
    },
    {
      name: "PRO",
      price: "$7",
      period: "/month",
      description: "Most popular for freelancers",
      features: [
        "Unlimited invoices",
        "Business profile with logo",
        "Digital signature support",
        "Invoice history",
        "Sorting and pagination",
        "Priority email support",
      ],
      buttonText: "Subscribe",
      buttonLink: "/signup",
      popular: true,
    },
    {
      name: "BUSINESS",
      price: "$12",
      period: "/month",
      description: "Perfect for growing businesses",
      features: [
        "Everything in Pro",
        "Arabic language support",
        "Priority customer support",
        "Advanced customization",
        "Team collaboration (coming soon)",
        "API access (coming soon)",
      ],
      buttonText: "Subscribe",
      buttonLink: "/signup",
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period, and you won't be charged again. No questions asked.",
    },
    {
      question: "What happens when I hit 5 free invoices?",
      answer: "When you reach the 5 invoice limit on the free plan, you'll need to upgrade to a paid plan to continue creating invoices. You can upgrade at any time to unlock unlimited invoice creation.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely! We use industry-standard encryption to protect your data. All invoices and business information are stored securely and backed up regularly. We never share your data with third parties.",
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 14-day money-back guarantee for new paid subscriptions. If you're not satisfied within the first 14 days, contact us for a full refund. After that, cancellations take effect at the end of your billing period.",
    },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Choose the perfect plan for your business. Start free and upgrade as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border ${
                plan.popular 
                  ? 'border-blue-500/50 ring-2 ring-blue-500/20' 
                  : 'border-slate-700/50'
              } p-8 hover:transform hover:scale-105 transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <p className="text-slate-300">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.name === "FREE" ? (
                <Link
                  href={plan.buttonLink}
                  className={`block w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors ${
                    plan.popular
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {plan.buttonText}
                </Link>
              ) : (
                <div className="text-center">
                  <div className="mb-4">
                    <span className="px-3 py-1 text-xs font-medium bg-green-500 text-white rounded-full">Current Plan</span>
                  </div>
                  {plan.name === "PRO" && (
                    <div className="text-center">
                      <div className="mb-4">
                        <span className="px-3 py-1 text-xs font-medium bg-green-500 text-white rounded-full">Current Plan</span>
                      </div>
                      <button
                        className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-100 border border-slate-300 text-slate-700 cursor-not-allowed"
                        disabled
                      >
                        Pro Plan Active
                      </button>
                      <Link
                        href="/signup"
                        className="mt-4 inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        Upgrade to Business
                      </Link>
                    </div>
                  </div>
                  )}
                  {plan.name === "BUSINESS" && (
                    <button
                      className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-slate-100 text-slate-700 cursor-not-allowed"
                      disabled
                    >
                      Business Plan Active
                    </button>
                  )}
                  {plan.name === "FREE" && (
                    <Link
                      href="/signup"
                      className="block w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Get Started Free
                    </Link>
                  )}
                  {user && plan.name === "FREE" && (
                    <Link
                      href="/login?redirect=/pricing"
                      className="mt-4 block w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors bg-slate-100 border border-slate-300 text-slate-700"
                    >
                      Log In to View Plans
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-300">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <span className="text-white font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
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

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to get started?
            </h3>
            <p className="text-slate-300 mb-6">
              Join thousands of professionals using Invoice Generator to streamline their invoicing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Invoice Generator. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="/pricing"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Pricing
              </a>
              <a
                href="/terms"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/privacy"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
