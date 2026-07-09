import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { escapeHtml } from "@/lib/escapeHtml";

const resend = new Resend(process.env.RESEND_API_KEY);

function getDaysDiff(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function reminderEmailHtml({
  clientName,
  senderName,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  type,
  days,
}: {
  clientName: string;
  senderName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  dueDate: string;
  type: "before" | "after";
  days: number;
}) {
  // Escape all sender-controlled values before interpolating into email HTML.
  clientName = escapeHtml(clientName);
  senderName = escapeHtml(senderName);
  invoiceNumber = escapeHtml(invoiceNumber);
  currency = escapeHtml(currency);

  const formattedDate = new Date(dueDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const subject =
    type === "before"
      ? `Your invoice is due in ${days} day${days !== 1 ? "s" : ""}`
      : `Invoice overdue by ${days} day${days !== 1 ? "s" : ""}`;

  const intro =
    type === "before"
      ? `This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> from <strong>${senderName}</strong> is due in <strong>${days} day${days !== 1 ? "s" : ""}</strong>.`
      : `Invoice <strong>${invoiceNumber}</strong> from <strong>${senderName}</strong> was due on <strong>${formattedDate}</strong> and is now <strong>${days} day${days !== 1 ? "s" : ""} overdue</strong>.`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background:#1e293b;padding:24px 32px;">
                <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">Invoice Reminder</p>
                <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:600;">${senderName}</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;color:#334155;font-size:15px;">Dear ${clientName},</p>
                <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">${intro}</p>

                <!-- Invoice details box -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color:#64748b;font-size:13px;padding-bottom:8px;">Invoice number</td>
                          <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding-bottom:8px;">${invoiceNumber}</td>
                        </tr>
                        <tr>
                          <td style="color:#64748b;font-size:13px;padding-bottom:8px;">Due date</td>
                          <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding-bottom:8px;">${formattedDate}</td>
                        </tr>
                        <tr>
                          <td style="border-top:1px solid #e2e8f0;padding-top:8px;color:#64748b;font-size:14px;font-weight:600;">Amount due</td>
                          <td style="border-top:1px solid #e2e8f0;padding-top:8px;color:#1e293b;font-size:16px;font-weight:700;text-align:right;">${currency} ${amount}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;color:#64748b;font-size:13px;">If you have any questions, please contact <strong>${senderName}</strong> directly.</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">Sent via Invoice Generator · invoices.ncgmgroup.com</p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export async function GET(req: NextRequest) {
  // 1. Authenticate the request
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // 2. Fetch all invoices with reminders enabled, due date set, and client email present
  const { data: invoices, error } = await supabaseAdmin
    .from("invoices")
    .select("id, user_id, invoice_number, client_name, client_email, sender_name, due_date, grand_total, currency, reminders")
    .not("reminders", "is", null)
    .not("client_email", "is", null)
    .not("due_date", "is", null);

  if (error) {
    console.error("Cron: failed to fetch invoices", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Reminders are a paid-plan feature — only send for senders whose subscription
  // is currently active (mirrors the isActive logic in SubscriptionProvider).
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, status, current_period_end, paddle_subscription_id")
    .not("paddle_subscription_id", "is", null);

  const now = new Date();
  const activeUserIds = new Set(
    (subs || [])
      .filter((s) => {
        const inPeriod = s.current_period_end ? new Date(s.current_period_end) > now : false;
        return (
          (s.status === "active" && (!s.current_period_end || inPeriod)) ||
          (s.status === "cancelled" && inPeriod)
        );
      })
      .map((s) => s.user_id)
  );

  let sent = 0;
  const errors: string[] = [];

  for (const invoice of invoices || []) {
    const reminders = invoice.reminders as {
      enabled: boolean;
      before_days: number;
      after_days: number;
      sent_before: boolean;
      sent_after: boolean;
    };

    if (!reminders?.enabled) continue;
    if (!activeUserIds.has(invoice.user_id)) continue;
    if (!invoice.client_email) continue;

    const dueDate = invoice.due_date;
    const daysUntilDue = getDaysDiff(todayStr, dueDate); // positive = future, negative = past

    const updates: Partial<typeof reminders> = {};

    // Before reminder
    if (
      reminders.before_days > 0 &&
      !reminders.sent_before &&
      daysUntilDue === reminders.before_days
    ) {
      try {
        await resend.emails.send({
          from: "Invoice Generator <noreply@ncgmgroup.com>",
          to: invoice.client_email,
          subject: `Reminder: Invoice ${invoice.invoice_number} due in ${reminders.before_days} day${reminders.before_days !== 1 ? "s" : ""}`,
          html: reminderEmailHtml({
            clientName: invoice.client_name || "there",
            senderName: invoice.sender_name || "your vendor",
            invoiceNumber: invoice.invoice_number,
            amount: Number(invoice.grand_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            currency: invoice.currency || "USD",
            dueDate,
            type: "before",
            days: reminders.before_days,
          }),
        });
        updates.sent_before = true;
        sent++;
      } catch (e) {
        errors.push(`before:${invoice.id}: ${e}`);
      }
    }

    // After reminder
    if (
      reminders.after_days > 0 &&
      !reminders.sent_after &&
      daysUntilDue === -reminders.after_days
    ) {
      try {
        await resend.emails.send({
          from: "Invoice Generator <noreply@ncgmgroup.com>",
          to: invoice.client_email,
          subject: `Overdue: Invoice ${invoice.invoice_number} was due ${reminders.after_days} day${reminders.after_days !== 1 ? "s" : ""} ago`,
          html: reminderEmailHtml({
            clientName: invoice.client_name || "there",
            senderName: invoice.sender_name || "your vendor",
            invoiceNumber: invoice.invoice_number,
            amount: Number(invoice.grand_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            currency: invoice.currency || "USD",
            dueDate,
            type: "after",
            days: reminders.after_days,
          }),
        });
        updates.sent_after = true;
        sent++;
      } catch (e) {
        errors.push(`after:${invoice.id}: ${e}`);
      }
    }

    // Persist sent flags
    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from("invoices")
        .update({ reminders: { ...reminders, ...updates } })
        .eq("id", invoice.id);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: invoices?.length ?? 0,
    sent,
    errors,
  });
}
