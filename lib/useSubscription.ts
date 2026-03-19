import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface SubscriptionData {
  plan: 'free' | 'pro' | 'business';
  isActive: boolean;
  invoiceCount: number;
  canGenerateInvoice: boolean;
  loading: boolean;
}

export function useSubscription() {
  const [data, setData] = useState<SubscriptionData>({
    plan: 'free',
    isActive: false,
    invoiceCount: 0,
    canGenerateInvoice: true,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    const fetchSubscriptionData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        console.log("DEBUG subscription - user:", user?.id);
        
        if (!user) {
          if (mounted) {
            setData({
              plan: 'free',
              isActive: false,
              invoiceCount: 0,
              canGenerateInvoice: true,
              loading: false,
            });
          }
          return;
        }

        // Fetch subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();
        console.log("DEBUG subscription - subscription data:", subscription);

        // Fetch invoice count
        const { count: invoiceCount } = await supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        const count = invoiceCount ?? 0;
        console.log("DEBUG subscription - invoice count:", count);

        // Determine plan and status
        let plan: 'free' | 'pro' | 'business' = 'free';
        let isActive = false;

        if (subscription) {
          plan = subscription.plan as 'free' | 'pro' | 'business';
          isActive = subscription.status === 'active' && 
                    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());
        }

        // Determine if user can generate invoices
        const canGenerateInvoice = isActive || count < 5;
        console.log("DEBUG subscription - canGenerateInvoice:", canGenerateInvoice, "isActive:", isActive, "count:", count);

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

    fetchSubscriptionData();

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
