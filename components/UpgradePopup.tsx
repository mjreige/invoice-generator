"use client";

import { useEffect, useState } from "react";
import { openCheckout } from "@/lib/paddle";
import { supabase } from "@/lib/supabaseClient";

interface UpgradePopupProps {
  show: boolean;
  onClose: () => void;
}

export default function UpgradePopup({ show, onClose }: UpgradePopupProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    loadUser();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    console.log('DEBUG upgrade popup - handleSubscribe called with priceId:', priceId);
    console.log('DEBUG upgrade popup - user:', user);
    
    if (!user?.email) {
      console.error('No user email found');
      return;
    }

    const proPriceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID;
    const businessPriceId = process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID;
    
    console.log('DEBUG upgrade popup - proPriceId:', proPriceId);
    console.log('DEBUG upgrade popup - businessPriceId:', businessPriceId);
    console.log('DEBUG upgrade popup - calling openCheckout with:', {
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
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [show, onClose]);

  if (!show) return null;

  const plans = [
    {
      name: "PRO",
      price: "$7",
      period: "/month",
      features: [
        "Unlimited invoices",
        "Business profile with logo",
        "Digital signature support",
        "Invoice history",
        "Sorting and pagination",
        "Priority email support",
      ],
      popular: true,
    },
    {
      name: "BUSINESS",
      price: "$12",
      period: "/month",
      features: [
        "Everything in Pro",
        "Arabic language support",
        "Priority customer support",
        "Advanced customization",
        "Team collaboration (coming soon)",
        "API access (coming soon)",
      ],
      popular: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              You have reached your 5 free invoice limit
            </h2>
            <p className="text-slate-300">
              Upgrade to unlock unlimited invoices and premium features
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-slate-700/50 rounded-xl border ${
                  plan.popular 
                    ? 'border-blue-500/50 ring-2 ring-blue-500/20' 
                    : 'border-slate-600/50'
                } p-6`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    console.log('DEBUG upgrade popup - Subscribe button clicked for', plan.name);
                    handleSubscribe(plan.name === "PRO" ? process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID! : process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID!);
                  }}
                  disabled={loading}
                  className="block w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors cursor-pointer ${
                    plan.popular
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-slate-600 hover:bg-slate-500 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Opening...' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>

          {/* Maybe later button */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
