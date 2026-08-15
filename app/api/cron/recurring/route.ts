import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { escapeHtml } from "@/lib/escapeHtml";
import { nextRunDate, addDays, type Frequency } from "@/lib/recurring";
import { getNextInvoiceNumber, type InvoiceNumberTemplate } from "@/lib/invoiceNumberTemplate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Invoice Generator <noreply@ncgmgroup.com>";
const APP = "https://invoices.ncgmgroup.com";

// A user must be an ACTIVE BUSINESS subscriber for their schedules to run.
function isActiveBusiness(sub: any): boolean {
  if (!sub || sub.plan !== "business" || !sub.paddle_subscription_id) return false;
  const now = Date.now();
  const inPeriod = sub.current_period_end ? new Date(sub.current_period_end).getTime() > now : false;
  return (
    (sub.status === "active" && (!sub.current_period_end || inPeriod)) ||
    (sub.status === "cancelled" && inPeriod)
  );
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // --- TEMP DEBUG: isolate which filter fails ---
  const base = () => supabaseAdmin.from("recurring_invoices").select("id");
  const [s1, s2, s3, s4] = await Promise.all([
    base().eq("status", "active"),
    base().lte("next_run_date", today),
    base().eq("next_run_date", today),
    base().eq("status", "active").lte("next_run_date", today),
  ]);
  const debug = {
    today,
    statusActiveCount: s1.data?.length ?? 0,
    dateLteCount: s2.data?.length ?? 0,
    dateEqCount: s3.data?.length ?? 0,
    bothCount: s4.data?.length ?? 0,
    errs: [s1.error?.message, s2.error?.message, s3.error?.message, s4.error?.message],
  };
  // --- end debug ---

  const { data: schedules, error } = await supabaseAdmin
    .from("recurring_invoices")
    .select("*")
    .eq("status", "active")
    .lte("next_run_date", today);

  if (error) {
    console.error("Recurring cron: fetch failed", error);
    return NextResponse.json({ error: "DB error", detail: error.message }, { status: 500 });
  }

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const s of schedules || []) {
    try {
      // 1. Gate: only active Business subscribers' schedules run.
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status, current_period_end, paddle_subscription_id")
        .eq("user_id", s.user_id)
        .single();
      if (!isActiveBusiness(sub)) {
        skipped++;
        continue; // leave it; it resumes when they're active again
      }

      const tpl = (s.template || {}) as Record<string, any>;
      const runDate = s.next_run_date as string;

      // 2. Assign an invoice number — use the user's numbering template if enabled,
      //    else a unique date-stamped fallback from the original number.
      const { data: profile } = await supabaseAdmin
        .from("business_profiles")
        .select("invoice_number_template")
        .eq("user_id", s.user_id)
        .single();

      let invoiceNumber: string;
      const numberTpl = profile?.invoice_number_template as InvoiceNumberTemplate | null;
      if (numberTpl?.enabled) {
        const { invoiceNumber: n, nextLastYear, nextLastSeq } = getNextInvoiceNumber(numberTpl);
        invoiceNumber = n;
        await supabaseAdmin
          .from("business_profiles")
          .update({ invoice_number_template: { ...numberTpl, last_year: nextLastYear, last_seq: nextLastSeq } })
          .eq("user_id", s.user_id);
      } else {
        const base = (tpl.number_base as string) || "INV";
        invoiceNumber = `${base}-${runDate.replace(/-/g, "")}`;
      }

      // 3. Build the invoice row from the template.
      const { number_base, ...invoiceFields } = tpl;
      void number_base;
      const { error: insErr } = await supabaseAdmin.from("invoices").insert({
        ...invoiceFields,
        user_id: s.user_id,
        invoice_number: invoiceNumber,
        due_date: addDays(runDate, s.due_days || 0),
        reminders: null,
      });
      if (insErr) {
        errors.push(`${s.id}: insert ${insErr.message}`);
        continue;
      }

      // 4. Advance the schedule (or complete it if past end_date).
      const nrd = nextRunDate(s.frequency as Frequency, new Date(runDate + "T00:00:00Z"));
      const completed = s.end_date && nrd > s.end_date;
      await supabaseAdmin
        .from("recurring_invoices")
        .update({
          last_generated_at: new Date().toISOString(),
          next_run_date: nrd,
          status: completed ? "completed" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", s.id);

      // 5. Notify the user (Path A: they review & send).
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(s.user_id);
      const email = userRes?.user?.email;
      if (email) {
        const amount = Number(tpl.grand_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: `Recurring invoice ready: ${invoiceNumber}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;">
              <h2 style="color:#1e293b;">Your recurring invoice is ready</h2>
              <p style="color:#475569;">A new invoice was generated from your recurring schedule.</p>
              <p style="color:#1e293b;"><strong>${escapeHtml(invoiceNumber)}</strong> — ${escapeHtml(String(tpl.client_name || ""))}<br/>
              ${escapeHtml(String(tpl.currency || "USD"))} ${amount}</p>
              <p><a href="${APP}/history" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Review &amp; send it</a></p>
              <p style="color:#64748b;font-size:13px;">It's saved in My Invoices. Open it to download the PDF or send it to your client.</p>
            </div>
          `,
        });
      }
      generated++;
    } catch (e) {
      errors.push(`${s.id}: ${e}`);
    }
  }

  return NextResponse.json({ ok: true, due: schedules?.length ?? 0, generated, skipped, errors, debug });
}
