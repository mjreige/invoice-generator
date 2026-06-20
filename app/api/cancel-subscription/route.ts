import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // 1. Authenticate the caller from their Supabase access token.
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { createClient } = await import("@supabase/supabase-js");

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // 2. Look up THIS user's own subscription — never trust a client-supplied id.
    const { data: sub } = await admin
      .from("subscriptions")
      .select("paddle_subscription_id")
      .eq("user_id", user.id)
      .single();

    const subscriptionId = sub?.paddle_subscription_id;
    if (!subscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 });
    }

    const paddleEnv = process.env.PADDLE_ENV || process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox";
    const isSandbox = paddleEnv === "sandbox";
    const baseUrl = isSandbox ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

    const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ effective_from: "next_billing_period" }),
    });

    const responseText = await response.text();
    console.log("Paddle cancel status:", response.status, responseText);

    // If already cancelled (400) or success (200), both are fine — update DB
    if (!response.ok && response.status !== 400) {
      return NextResponse.json({ error: `Paddle error: ${response.status}` }, { status: 500 });
    }

    // 3. Update only this user's row.
    await admin
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
