import { NextResponse } from "next/server";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/escapeHtml";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// --- Refund policy knobs (tweak here) ---
const REFUND_WINDOW_DAYS = 30;
const PACK_USED_LIMIT = 0.5; // deny pack refunds once more than this fraction of credits is used

function packLabel(packType: string | null): string {
  return packType === "business_pack"
    ? "Max Pack"
    : packType === "pro_pack"
    ? "Plus Pack"
    : "Starter Pack";
}

export async function POST(request: Request) {
  try {
    // Authenticate the caller from their Supabase access token.
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let confirm = false;
    try {
      const body = await request.json();
      confirm = body?.confirm === true;
    } catch {
      // no body — treat as a preview request
    }

    const { createClient } = await import("@supabase/supabase-js");
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!rateLimit(`refund:${user.id}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan, status, pack_type, invoice_credits, credits_used, paddle_subscription_id, paddle_customer_id, last_purchase_at")
      .eq("user_id", user.id)
      .single();

    // --- Determine purchase type ---
    const invoiceCredits = sub?.invoice_credits || 0;
    const creditsUsed = sub?.credits_used || 0;
    const remaining = Math.max(0, invoiceCredits - creditsUsed);
    const isSubscription =
      !!sub?.paddle_subscription_id && sub?.status === "active" && (sub?.plan === "pro" || sub?.plan === "business");
    const isPack = !isSubscription && !!sub?.pack_type && invoiceCredits > 0;

    // --- Eligibility ---
    let eligible = false;
    let reason = "";
    let summary = "";
    let kind: "subscription" | "pack" | "none" = "none";

    const lastPurchase = sub?.last_purchase_at ? Date.parse(sub.last_purchase_at) : NaN;
    const withinWindow =
      !Number.isNaN(lastPurchase) && Date.now() - lastPurchase <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (!isSubscription && !isPack) {
      reason = "We couldn't find a refundable purchase on your account.";
    } else if (!withinWindow) {
      reason = `This purchase is outside the ${REFUND_WINDOW_DAYS}-day refund window, so it's no longer eligible for a refund.`;
    } else if (isPack) {
      kind = "pack";
      const usedFraction = invoiceCredits > 0 ? creditsUsed / invoiceCredits : 1;
      if (usedFraction > PACK_USED_LIMIT) {
        reason = `Refunds aren't available once more than half of your pack credits have been used (you've used ${creditsUsed} of ${invoiceCredits}).`;
      } else {
        eligible = true;
        summary = `Refunding your ${packLabel(sub!.pack_type)} returns your payment and removes your remaining ${remaining} credit${remaining === 1 ? "" : "s"}. Your account returns to Free.`;
      }
    } else {
      kind = "subscription";
      eligible = true;
      const planLabel = sub!.plan === "business" ? "Business" : "Pro";
      summary = `Refunding your ${planLabel} plan returns your latest payment and cancels the subscription. Access ends immediately; invoices you've already created stay in your history.`;
    }

    // Preview request — just return the decision.
    if (!confirm) {
      return NextResponse.json({ eligible, reason, summary, kind });
    }

    // Confirm request — re-check, then email the request to support.
    if (!eligible) {
      return NextResponse.json({ eligible: false, reason });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const action =
      kind === "subscription"
        ? "Refund the latest payment AND cancel the subscription in Paddle."
        : "Refund the transaction in Paddle.";
    await resend.emails.send({
      from: "Invoice Generator <noreply@ncgmgroup.com>",
      to: "sales@ncgmgroup.com",
      replyTo: user.email || undefined,
      subject: `[Refund request] ${escapeHtml(user.email)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color:#1e293b;">Refund request</h2>
          <p><strong>Customer:</strong> ${escapeHtml(user.email)}</p>
          <p><strong>Type:</strong> ${escapeHtml(kind)}</p>
          <p><strong>Plan / pack:</strong> ${escapeHtml(kind === "subscription" ? sub!.plan : packLabel(sub!.pack_type))}</p>
          <p><strong>Credits:</strong> ${creditsUsed} used of ${invoiceCredits} (${remaining} remaining)</p>
          <p><strong>Paddle subscription id:</strong> ${escapeHtml(sub!.paddle_subscription_id || "—")}</p>
          <p><strong>Paddle customer id:</strong> ${escapeHtml(sub!.paddle_customer_id || "—")}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
          <p style="color:#1e293b;"><strong>Action:</strong> ${action}</p>
          <p style="color:#64748b;font-size:13px;">Once Paddle approves the refund, the app automatically revokes the credits / cancels access.</p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Refund request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
