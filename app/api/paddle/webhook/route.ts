import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Webhook received:', body.event_type);
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const eventType = body.event_type;
    const data = body.data;

    if (eventType === 'subscription.created' || eventType === 'subscription.activated') {
      const customData = data.custom_data || {};
      const userId = customData.userId || customData.user_id;
      const priceId = data.items?.[0]?.price?.id;
      
      const proPriceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || 'pri_01kkshav4ehmnnwz4an3z07wes';
      const businessPriceId = process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID || 'pri_01kkshe2hfk9jp508nyy8q081v';
      
      const plan = priceId === businessPriceId ? 'business' : 'pro';
      
      console.log('Processing subscription:', { userId, priceId, plan });
      
      if (userId) {
        const { error } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          paddle_subscription_id: data.id,
          paddle_customer_id: data.customer_id,
          plan: plan,
          status: 'active',
          current_period_end: data.current_billing_period?.ends_at || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
        if (error) console.error('Supabase error:', error);
        else console.log('Subscription saved successfully for user:', userId);
      } else {
        console.error('No userId found in custom_data:', customData);
      }
    }

    if (eventType === 'subscription.updated') {
      const subscriptionId = data.id;
      const { error } = await supabase.from('subscriptions')
        .update({
          status: data.status === 'active' ? 'active' : data.status,
          current_period_end: data.current_billing_period?.ends_at || null,
          updated_at: new Date().toISOString()
        })
        .eq('paddle_subscription_id', subscriptionId);
      
      if (error) console.error('Supabase update error:', error);
    }

    if (eventType === 'subscription.cancelled') {
      const subscriptionId = data.id;
      const { error } = await supabase.from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('paddle_subscription_id', subscriptionId);
      
      if (error) console.error('Supabase cancel error:', error);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
