"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

interface SubscriptionData {
  plan: "free" | "pro" | "business";
  isActive: boolean;
  invoiceCount: number;
  canGenerateInvoice: boolean;
  creditsRemaining: number;
  hasCredits: boolean;
  loading: boolean;
}

const defaultData: SubscriptionData = {
  plan: "free",
  isActive: false,
  invoiceCount: 0,
  canGenerateInvoice: true,
  creditsRemaining: 0,
  hasCredits: false,
  loading: true,
};

const SubscriptionContext = createContext<SubscriptionData>(defaultData);

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SubscriptionData>(defaultData);

  useEffect(() => {
    let mounted = true;
    let hasFetched = false;

    const fetchData = async (userId: string) => {
      try {
        const [subResult, countResult] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("plan, status, current_period_end, invoice_credits, credits_used")
            .eq("user_id", userId)
            .single(),
          supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);

        const subscription = subResult.data;
        const count = countResult.count ?? 0;

        let plan: "free" | "pro" | "business" = "free";
        let isActive = false;
        let creditsRemaining = 0;

        if (subscription) {
          plan = subscription.plan as "free" | "pro" | "business";
          isActive =
            subscription.status === "active" &&
            (!subscription.current_period_end ||
              new Date(subscription.current_period_end) > new Date());

          const credits = subscription.invoice_credits || 0;
          const used = subscription.credits_used || 0;
          creditsRemaining = Math.max(0, credits - used);
        }

        const hasCredits = creditsRemaining > 0;
        const canGenerateInvoice = isActive || hasCredits || count < 5;

        if (mounted) {
          hasFetched = true;
          setData({
            plan,
            isActive,
            invoiceCount: count,
            canGenerateInvoice,
            creditsRemaining,
            hasCredits,
            loading: false,
          });
        }
      } catch {
        if (mounted) {
          hasFetched = true;
          setData({ ...defaultData, loading: false });
        }
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        hasFetched = false;
        setData({ ...defaultData, loading: false });
        return;
      }

      if (event === "SIGNED_IN" && session?.user && !hasFetched) {
        setData((prev) => ({ ...prev, loading: true }));
        await fetchData(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && mounted) {
        fetchData(session.user.id);
      } else if (mounted) {
        setData({ ...defaultData, loading: false });
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={data}>
      {children}
    </SubscriptionContext.Provider>
  );
}
