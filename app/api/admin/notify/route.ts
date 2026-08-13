import { NextResponse } from "next/server";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/escapeHtml";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

// Where you want the pings. Change to sales@ncgmgroup.com if you prefer.
const NOTIFY_TO = "m.jreige@gmail.com";
const FROM = "Invoice Generator <noreply@ncgmgroup.com>";

// Called by a Postgres trigger on auth.users via pg_net. Authenticated with the
// same CRON_SECRET as the other server jobs.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const type = body.type;
  if (type !== "signup" && type !== "verified") {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }
  const emailRaw = body.email || "unknown";
  const email = escapeHtml(emailRaw);

  const subject = type === "signup" ? `🆕 New signup: ${emailRaw}` : `✅ Verified: ${emailRaw}`;
  const heading = type === "signup" ? "New signup" : "Email verified";

  try {
    await resend.emails.send({
      from: FROM,
      to: NOTIFY_TO,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;">
          <h2 style="color:#1e293b;margin:0 0 8px;">${heading}</h2>
          <p style="font-size:16px;color:#1e293b;margin:0 0 4px;"><strong>${email}</strong></p>
          <p style="color:#64748b;font-size:12px;margin:0;">${new Date().toISOString()}</p>
        </div>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin notify error:", e);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }
}
