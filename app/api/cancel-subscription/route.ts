import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
    }

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      console.error("PADDLE_API_KEY not set");
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 });
    }

    // NEXT_PUBLIC_ vars are not reliable in server-side API routes
    // Use PADDLE_ENV (server-side only) with fallback
    const paddleEnv = process.env.PADDLE_ENV || process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox";
    const isSandbox = paddleEnv === "sandbox";
    const baseUrl = isSandbox
      ? "https://sandbox-api.paddle.com"
      : "https://api.paddle.com";

    console.log("Paddle env:", paddleEnv, "isSandbox:", isSandbox, "baseUrl:", baseUrl);
    console.log("Cancelling subscription:", subscriptionId);

    const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ effective_from: "next_billing_period" }),
    });

    const responseText = await response.text();
    console.log("Paddle response status:", response.status);
    console.log("Paddle response body:", responseText);

    if (!response.ok) {
      console.error("Paddle cancel failed:", response.status, responseText);
      return NextResponse.json({
        error: `Paddle error: ${response.status}`,
        details: responseText
      }, { status: 500 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: dbError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("paddle_subscription_id", subscriptionId);

    if (dbError) console.error("DB update error:", dbError);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
