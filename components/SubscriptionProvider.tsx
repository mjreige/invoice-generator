"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface SubscriptionData {
  plan: "free" | "pro" | "business";
  effectivePlan: "free" | "pro" | "business";
  isActive: boolean;
  invoiceCount: number;
  canGenerateInvoice: boolean;
  creditsRemaining: number;
  hasCredits: boolean;
  loading: boolean;
  refresh: () => void;
}

const defaultData: SubscriptionData = {
  plan: "free",
  effectivePlan: "free",
  isActive: false,
  invoiceCount: 0,
  canGenerateInvoice: true,
  creditsRemaining: 0,
  hasCredits: false,
  loading: true,
  refresh: () => {},
};

const PROTECTED_PATHS = ["/invoice", "/history", "/profile", "/manage-subscription"];

const SubscriptionContext = createContext<SubscriptionData>(defaultData);

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SubscriptionData>(defaultData);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const fetchData = useCallback(async (userId: string) => {
    try {
      const [subResult, countResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan, status, current_period_end, invoice_credits, credits_used, paddle_subscription_id, pack_type")
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
      let effectivePlan: "free" | "pro" | "business" = "free";

      if (subscription) {
        plan = subscription.plan as "free" | "pro" | "business";

        isActive =
          !!subscription.paddle_subscription_id &&
          (
            (subscription.status === "active" && (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())) ||
            (subscription.status === "cancelled" && !!subscription.current_period_end && new Date(subscription.current_period_end) > new Date())
          );

        const credits = subscription.invoice_credits || 0;
        const used = subscription.credits_used || 0;
        creditsRemaining = isActive ? 0 : Math.max(0, credits - used);

        // Determine effective plan based on actual access
        if (isActive) {
          effectivePlan = plan; // pro or business from subscription
        } else if (creditsRemaining > 0) {
          // Based on pack type purchased
          const packType = subscription.pack_type;
          if (packType === "business_pack") effectivePlan = "business";
          else if (packType === "pro_pack") effectivePlan = "pro";
          else effectivePlan = "free"; // starter pack = basic features only
        } else {
          effectivePlan = "free";
        }
      }

      const hasCredits = creditsRemaining > 0;
      const canGenerateInvoice = isActive || hasCredits || count < 5;

      setData(prev => ({
        ...prev,
        plan,
        effectivePlan,
        isActive,
        invoiceCount: count,
        canGenerateInvoice,
        creditsRemaining,
        hasCredits,
        loading: false,
      }));
    } catch {
      setData(prev => ({ ...prev, ...defaultData, loading: false, refresh: prev.refresh }));
    }
  }, []);

  const refresh = useCallback(() => {
    if (userIdRef.current) {
      fetchData(userIdRef.current);
    }
  }, [fetchData]);

  useEffect(() => {
    let mounted = true;
    let hasFetched = false;

    const fetchAndStore = async (userId: string) => {
      userIdRef.current = userId;
      await fetchData(userId);
      if (mounted) hasFetched = true;
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        hasFetched = false;
        userIdRef.current = null;
        setData({ ...defaultData, loading: false, refresh });
        const isProtected = PROTECTED_PATHS.some(p => pathnameRef.current?.startsWith(p));
        if (isProtected) router.replace("/login");
        return;
      }

      if (event === "SIGNED_IN" && session) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get("redirect");
        if (redirectTo) router.replace(redirectTo);
        if (!hasFetched) {
          setData((prev) => ({ ...prev, loading: true }));
          fetchAndStore(session.user.id);
        }
      }
    });

    const sessionTimeout = setTimeout(() => {
      if (mounted && !hasFetched) {
        setData({ ...defaultData, loading: false, refresh });
      }
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(sessionTimeout);
      if (session?.user && mounted) {
        fetchAndStore(session.user.id);
      } else if (mounted && !hasFetched) {
        setData({ ...defaultData, loading: false, refresh });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(sessionTimeout);
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inject refresh into data
  const dataWithRefresh = { ...data, refresh };

  return (
    <SubscriptionContext.Provider value={dataWithRefresh}>
      {children}
    </SubscriptionContext.Provider>
  );
}
