import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('paddle-signature');
    
    if (!signature) {
      console.error('Missing Paddle signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const secret = process.env.PADDLE_API_KEY!;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('Paddle webhook event:', event);

    // Handle different event types
    switch (event.event_type) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionEvent(event);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event);
        break;
      default:
        console.log('Unhandled event type:', event.event_type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleSubscriptionEvent(event: any) {
  const subscription = event.data;
  const userId = subscription.custom_data?.userId;
  
  if (!userId) {
    console.error('No userId found in subscription custom data');
    return;
  }

  // Determine plan from price ID
  const plan = getPlanFromPriceId(subscription.items[0]?.price_id);
  
  const subscriptionData = {
    user_id: userId,
    paddle_subscription_id: subscription.id,
    paddle_customer_id: subscription.customer_id,
    plan: plan,
    status: subscription.status,
    current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end).toISOString() : null,
  };

  // Upsert subscription
  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }

  console.log(`Subscription ${event.event_type} for user ${userId}, plan: ${plan}`);
}

async function handleSubscriptionCancelled(event: any) {
  const subscription = event.data;
  const userId = subscription.custom_data?.userId;
  
  if (!userId) {
    console.error('No userId found in subscription custom data');
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end).toISOString() : null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating cancelled subscription:', error);
    throw error;
  }

  console.log(`Subscription cancelled for user ${userId}`);
}

function getPlanFromPriceId(priceId: string): 'free' | 'pro' | 'business' {
  const proPriceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID;
  const businessPriceId = process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID;

  if (priceId === proPriceId) return 'pro';
  if (priceId === businessPriceId) return 'business';
  return 'free';
}
