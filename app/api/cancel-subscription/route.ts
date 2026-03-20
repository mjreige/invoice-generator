import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
    }

    const apiKey = process.env.PADDLE_API_KEY;
    const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox";
    const baseUrl = isSandbox
      ? "https://sandbox-api.paddle.com"
      : "https://api.paddle.com";

    const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ effective_from: "next_billing_period" }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Paddle cancel error:", error);
      return NextResponse.json({ error: "Failed to cancel with Paddle" }, { status: 500 });
    }

    // Update Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("paddle_subscription_id", subscriptionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
