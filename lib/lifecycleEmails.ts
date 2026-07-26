import { escapeHtml } from "@/lib/escapeHtml";

// Shared branded layout for lifecycle emails — mirrors the reminder email style.
function layout(opts: { heading: string; bodyHtml: string }): string {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:#1e293b;padding:24px 32px;">
              <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">Invoice Generator</p>
              <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:600;">${opts.heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#334155;font-size:15px;line-height:1.6;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">Invoice Generator · invoices.ncgmgroup.com · <a href="mailto:sales@ncgmgroup.com" style="color:#94a3b8;">sales@ncgmgroup.com</a></p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

function button(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:10px;background:#4f46e5;">
    <a href="${href}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">${label}</a>
  </td></tr></table>`;
}

const APP = "https://invoices.ncgmgroup.com";

export function welcomeEmail(firstName: string) {
  const name = escapeHtml(firstName || "there");
  return {
    subject: "Welcome — let's make your first invoice",
    html: layout({
      heading: "Welcome aboard",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${name},</p>
        <p style="margin:0 0 16px;">Welcome to Invoice Generator — glad you're here.</p>
        <p style="margin:0 0 16px;">You can create your first branded, professional invoice right now, free. No credit card, no setup: fill in your details, add line items, and download a clean PDF in about two minutes.</p>
        ${button(`${APP}/invoice`, "Create your first invoice")}
        <p style="margin:0 0 8px;">A few things people find useful early on:</p>
        <ul style="margin:0 0 16px;padding-left:20px;color:#475569;">
          <li style="margin-bottom:6px;">25+ currencies, tax, and a digital signature — so it looks right wherever you bill</li>
          <li style="margin-bottom:6px;">Save customers and line items so the next invoice is even faster</li>
          <li style="margin-bottom:6px;">Proper Arabic / right-to-left PDFs, if you need them</li>
        </ul>
        <p style="margin:0;color:#64748b;font-size:14px;">Your free plan includes 5 invoices to get started. Stuck? Just reply to this email — a real person will help.</p>
      `,
    }),
  };
}

export function activationEmail(firstName: string) {
  const name = escapeHtml(firstName || "there");
  return {
    subject: "A quick head start on your first invoice",
    html: layout({
      heading: "Your first invoice, in 2 minutes",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${name},</p>
        <p style="margin:0 0 16px;">Noticed you signed up but haven't made an invoice yet — no worries, here's the two-minute version:</p>
        <ol style="margin:0 0 16px;padding-left:20px;color:#475569;">
          <li style="margin-bottom:6px;">Add your details and your client's</li>
          <li style="margin-bottom:6px;">Add your line items (quantity, unit, and price)</li>
          <li style="margin-bottom:6px;">Apply a discount or tax if you need to, then download the PDF</li>
        </ol>
        <p style="margin:0 0 8px;">That's it — a branded invoice ready to send.</p>
        ${button(`${APP}/invoice`, "Make your first invoice")}
        <p style="margin:0;color:#64748b;font-size:14px;">If something got in the way — a missing feature, a question, anything — just reply and tell me. I read every message.</p>
      `,
    }),
  };
}

export function upgradeEmail(firstName: string, invoiceCount: number, includeLaunchOffer: boolean) {
  const name = escapeHtml(firstName || "there");
  const offer = includeLaunchOffer
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#eef2ff;border-radius:8px;color:#3730a3;font-size:14px;"><strong>Launch week:</strong> take <strong>30% off</strong> your first purchase with code <strong>LAUNCH30</strong> (first 100 customers).</p>`
    : "";
  return {
    subject: `You've used ${invoiceCount} of your 5 free invoices`,
    html: layout({
      heading: "Keep the invoices flowing",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${name},</p>
        <p style="margin:0 0 16px;">You've created ${invoiceCount} invoices so far — looks like it's working for you. You're close to the 5-invoice free limit, so here's how to keep going without missing a beat:</p>
        <ul style="margin:0 0 16px;padding-left:20px;color:#475569;">
          <li style="margin-bottom:6px;"><strong>Credit packs that never expire</strong> — from $4.99. Pay once, use them whenever. Perfect for occasional invoicing.</li>
          <li style="margin-bottom:6px;"><strong>Go unlimited</strong> — Pro is $9/mo and Business is $15/mo, with automatic payment reminders so you get paid on time without chasing.</li>
        </ul>
        ${offer}
        <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Not sure which fits? Packs are best for light or irregular use; a subscription pays off once you're billing regularly.</p>
        ${button(`${APP}/pricing`, "See your options")}
      `,
    }),
  };
}
