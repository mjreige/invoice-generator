import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Webhook received:", body.event_type);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const eventType = body.event_type;
    const data = body.data;

    const proPriceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || "pri_01kkshav4ehmnnwz4an3z07wes";
    const businessPriceId = process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID || "pri_01kkshe2hfk9jp508nyy8q081v";
    const starterPriceId = process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID || "pri_01km55j5sc439a0p5n2772egbp";
    const proPackPriceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PACK_PRICE_ID || "pri_01km55kskn8sv6ea8hrg940h1p";
    const businessPackPriceId = process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PACK_PRICE_ID || "pri_01km55py4yxzgsgg13sec7h5z9";

    // Handle subscriptions
    if (eventType === "subscription.created" || eventType === "subscription.activated") {
      const customData = data.custom_data || {};
      const userId = customData.userId || customData.user_id;
      const priceId = data.items?.[0]?.price?.id;
      const plan = priceId === businessPriceId ? "business" : "pro";

      console.log("Processing subscription:", { userId, priceId, plan });

      if (userId) {
        const { error } = await supabase.from("subscriptions").upsert({
          user_id: userId,
          paddle_subscription_id: data.id,
          paddle_customer_id: data.customer_id,
          plan,
          status: "active",
          current_period_end: data.current_billing_period?.ends_at || null,
          invoice_credits: 0,
          credits_used: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        if (error) console.error("Supabase subscription error:", error);
        else console.log("Subscription saved for user:", userId);
      }
    }

    // Handle one-time credit purchases
    if (eventType === "transaction.completed") {
      const customData = data.custom_data || {};
      const userId = customData.userId || customData.user_id;
      const priceId = data.items?.[0]?.price?.id;

      console.log("Transaction completed:", { userId, priceId });

      let creditsToAdd = 0;
      let packType = "";

      if (priceId === starterPriceId) {
        creditsToAdd = 10;
        packType = "starter";
      } else if (priceId === proPackPriceId) {
        creditsToAdd = 25;
        packType = "pro_pack";
      } else if (priceId === businessPackPriceId) {
        creditsToAdd = 50;
        packType = "business_pack";
      }

      if (creditsToAdd > 0 && userId) {
        // First check if user already has a subscription row
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("invoice_credits, credits_used, plan")
          .eq("user_id", userId)
          .single();

        if (existing) {
          // Add credits to existing row
          const newCredits = (existing.invoice_credits || 0) + creditsToAdd;
          const { error } = await supabase
            .from("subscriptions")
            .update({
              invoice_credits: newCredits,
              pack_type: packType,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          if (error) console.error("Credits update error:", error);
          else console.log(`Added ${creditsToAdd} credits for user ${userId}, total: ${newCredits}`);
        } else {
          // Create new row for credits user
          const { error } = await supabase.from("subscriptions").insert({
            user_id: userId,
            plan: "free",
            status: "active",
            invoice_credits: creditsToAdd,
            credits_used: 0,
            pack_type: packType,
            updated_at: new Date().toISOString(),
          });

          if (error) console.error("Credits insert error:", error);
          else console.log(`Created credits row with ${creditsToAdd} credits for user ${userId}`);
        }
      }
    }

    // Handle subscription updates
    if (eventType === "subscription.updated") {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: data.status === "active" ? "active" : data.status,
          current_period_end: data.current_billing_period?.ends_at || null,
          updated_at: new Date().toISOString(),
        })
        .eq("paddle_subscription_id", data.id);

      if (error) console.error("Subscription update error:", error);
    }

    // Handle subscription cancellation
    if (eventType === "subscription.cancelled") {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("paddle_subscription_id", data.id);

      if (error) console.error("Subscription cancel error:", error);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
