import { useSubscriptionContext } from "@/components/SubscriptionProvider";

// This hook now reads from the global context instead of fetching independently
export function useSubscription() {
  return useSubscriptionContext();
}


interface SubscriptionData {
  plan: 'free' | 'pro' | 'business';
  isActive: boolean;
  invoiceCount: number;
  canGenerateInvoice: boolean;
  loading: boolean;
}

const defaultData: SubscriptionData = {
  plan: 'free',
  isActive: false,
  invoiceCount: 0,
  canGenerateInvoice: true,
  loading: true,
};

export function useSubscription() {
  const [data, setData] = useState<SubscriptionData>(defaultData);

  useEffect(() => {
    let mounted = true;

    const fetchSubscriptionData = async (userId: string) => {
      try {
        const [subResult, countResult] = await Promise.all([
          supabase
            .from('subscriptions')
            .select('plan, status, current_period_end')
            .eq('user_id', userId)
            .single(),
          supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
        ]);

        const subscription = subResult.data;
        const count = countResult.count ?? 0;

        let plan: 'free' | 'pro' | 'business' = 'free';
        let isActive = false;

        if (subscription) {
          plan = subscription.plan as 'free' | 'pro' | 'business';
          isActive =
            subscription.status === 'active' &&
            (!subscription.current_period_end ||
              new Date(subscription.current_period_end) > new Date());
        }

        const canGenerateInvoice = isActive || count < 5;

        if (mounted) {
          setData({
            plan,
            isActive,
            invoiceCount: count,
            canGenerateInvoice,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        if (mounted) {
          setData({
            plan: 'free',
            isActive: false,
            invoiceCount: 0,
            canGenerateInvoice: true,
            loading: false,
          });
        }
      }
    };

    // Listen to auth state changes so we fetch immediately when user logs in
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setData((prev) => ({ ...prev, loading: true }));
          await fetchSubscriptionData(session.user.id);
        } else {
          setData({
            plan: 'free',
            isActive: false,
            invoiceCount: 0,
            canGenerateInvoice: true,
            loading: false,
          });
        }
      }
    );

    // Also fetch immediately on mount in case session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && mounted) {
        fetchSubscriptionData(session.user.id);
      } else if (mounted) {
        setData({ ...defaultData, loading: false });
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return data;
}
