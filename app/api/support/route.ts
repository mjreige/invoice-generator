import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rateLimit";
import { escapeHtml } from "@/lib/escapeHtml";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`support:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    await resend.emails.send({
      from: "Invoice Generator Support <noreply@ncgmgroup.com>",
      to: "sales@ncgmgroup.com",
      replyTo: email,
      subject: `[Support] ${escapeHtml(subject)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">New Support Request</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 80px;"><strong>From:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${escapeHtml(email)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Subject:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${escapeHtml(subject)}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #1e293b; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Support email error:", err);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
