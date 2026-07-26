import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { welcomeEmail, activationEmail, upgradeEmail } from "@/lib/lifecycleEmails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Invoice Generator <noreply@ncgmgroup.com>";

// Launch-week window for the 30% code in the upgrade email (UTC). Adjust/remove after launch.
const LAUNCH_START = Date.parse("2026-08-04T00:00:00Z");
const LAUNCH_END = Date.parse("2026-08-11T23:59:59Z");
function inLaunchWindow(): boolean {
  const now = Date.now();
  return now >= LAUNCH_START && now <= LAUNCH_END;
}

const ACTIVATION_DELAY_MS = 2 * 24 * 60 * 60 * 1000; // ~48h after signup
const FREE_LIMIT = 5;
const UPGRADE_AT = 4; // nudge once they've made this many invoices

export async function GET(req: NextRequest) {
  // Auth: same Bearer CRON_SECRET scheme as the reminders cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const firstNameOf = (u: { user_metadata?: Record<string, unknown> }) =>
    (u.user_metadata?.first_name as string) || "there";

  // 1. Load confirmed users (launch-scale: first page is plenty; paginate later if needed).
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) {
    console.error("Lifecycle: listUsers failed", listErr);
    return NextResponse.json({ error: "listUsers failed" }, { status: 500 });
  }
  const users = (list?.users || []).filter((u) => u.email && u.email_confirmed_at);

  // 2. Load already-sent flags, subscriptions, and invoice counts in bulk.
  const [flagsRes, subsRes, invRes] = await Promise.all([
    supabaseAdmin.from("lifecycle_emails").select("user_id, welcome_sent_at, activation_sent_at, upgrade_sent_at"),
    supabaseAdmin.from("subscriptions").select("user_id, status, current_period_end, paddle_subscription_id, invoice_credits, credits_used"),
    supabaseAdmin.from("invoices").select("user_id"),
  ]);

  const flags = new Map<string, { welcome_sent_at: string | null; activation_sent_at: string | null; upgrade_sent_at: string | null }>();
  (flagsRes.data || []).forEach((f) => flags.set(f.user_id, f));

  const subs = new Map<string, any>();
  (subsRes.data || []).forEach((s) => subs.set(s.user_id, s));

  const invoiceCount = new Map<string, number>();
  (invRes.data || []).forEach((r: { user_id: string }) => invoiceCount.set(r.user_id, (invoiceCount.get(r.user_id) || 0) + 1));

  const now = Date.now();
  const isPaid = (userId: string) => {
    const s = subs.get(userId);
    if (!s) return false;
    const inPeriod = s.current_period_end ? new Date(s.current_period_end).getTime() > now : false;
    const active = !!s.paddle_subscription_id && s.status === "active" && (!s.current_period_end || inPeriod);
    const cancelledButActive = !!s.paddle_subscription_id && s.status === "cancelled" && inPeriod;
    const hasCredits = (s.invoice_credits || 0) - (s.credits_used || 0) > 0;
    return active || cancelledButActive || hasCredits;
  };

  let welcome = 0, activation = 0, upgrade = 0;
  const errors: string[] = [];

  for (const u of users) {
    const f = flags.get(u.id);
    const count = invoiceCount.get(u.id) || 0;
    const createdMs = u.created_at ? Date.parse(u.created_at) : now;
    const updates: Record<string, string> = {};

    try {
      // Welcome — once confirmed.
      if (!f?.welcome_sent_at) {
        const e = welcomeEmail(firstNameOf(u));
        await resend.emails.send({ from: FROM, to: u.email!, subject: e.subject, html: e.html });
        updates.welcome_sent_at = new Date().toISOString();
        welcome++;
      }

      // Activation — ~48h in, still no invoice, not already sent.
      if (!f?.activation_sent_at && count === 0 && now - createdMs >= ACTIVATION_DELAY_MS) {
        const e = activationEmail(firstNameOf(u));
        await resend.emails.send({ from: FROM, to: u.email!, subject: e.subject, html: e.html });
        updates.activation_sent_at = new Date().toISOString();
        activation++;
      }

      // Upgrade — free user near the limit, not already sent.
      if (!f?.upgrade_sent_at && !isPaid(u.id) && count >= UPGRADE_AT && count < FREE_LIMIT) {
        const e = upgradeEmail(firstNameOf(u), count, inLaunchWindow());
        await resend.emails.send({ from: FROM, to: u.email!, subject: e.subject, html: e.html });
        updates.upgrade_sent_at = new Date().toISOString();
        upgrade++;
      }

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("lifecycle_emails").upsert({ user_id: u.id, ...updates }, { onConflict: "user_id" });
      }
    } catch (err) {
      errors.push(`${u.id}: ${err}`);
    }
  }

  return NextResponse.json({ ok: true, users: users.length, welcome, activation, upgrade, errors });
}
