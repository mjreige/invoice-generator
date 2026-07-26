# Welcome / Nurture Email Sequence

_Draft copy for approval. Sent via Resend from **Invoice Generator &lt;noreply@ncgmgroup.com&gt;**. Once you're happy with the wording, I'll turn these into branded HTML templates matching your reminder emails and scope the automation._

**Voice:** founder-authentic, helpful, plain — no hype. One clear call-to-action per email.

Merge fields: `{{firstName}}` (fall back to "there" if empty), `{{invoiceCount}}` where noted.

---

## Email 1 — Welcome (sent immediately on signup)

**Subject line (selected):** Welcome — let's make your first invoice

**Preview text:** No credit card, no clutter — just a clean PDF invoice.

**Body**

Hi {{firstName}},

Welcome to Invoice Generator — glad you're here.

You can create your first branded, professional invoice right now, free. No credit card, no setup: fill in your details, add line items, and download a clean PDF in about two minutes.

**→ Create your first invoice** (button → https://invoices.ncgmgroup.com/invoice)

A few things people find useful early on:
- 25+ currencies, tax, and a digital signature — so it looks right wherever you bill
- Save customers and line items so the next invoice is even faster
- Proper Arabic / right-to-left PDFs, if you need them

Your free plan includes 5 invoices to get started. If you get stuck, just reply to this email or reach us at sales@ncgmgroup.com — a real person will help.

Happy invoicing,
The Invoice Generator team

---

## Email 2 — Activation nudge (sent ~2 days after signup, ONLY if they haven't created an invoice yet)

**Subject line (selected):** A quick head start on your first invoice

**Preview text:** A clean, branded PDF is faster than you'd think.

**Body**

Hi {{firstName}},

Noticed you signed up but haven't made an invoice yet — no worries, here's the two-minute version:

1. Add your details and your client's
2. Add your line items (with quantity, unit, and price)
3. Apply a discount or tax if you need to, then download the PDF

That's it — a branded invoice ready to send.

**→ Make your first invoice** (button → https://invoices.ncgmgroup.com/invoice)

If something got in the way — a missing feature, a question, anything — just reply and tell me. I read every message.

Best,
The Invoice Generator team

---

## Email 3 — Upgrade nudge (sent when a free user nears the limit, e.g. after their 4th invoice)

**Subject line (selected):** You've used {{invoiceCount}} of your 5 free invoices

**Preview text:** Buy credits that never expire, or go unlimited for the price of a coffee.

**Body**

Hi {{firstName}},

You've created {{invoiceCount}} invoices so far — looks like it's working for you. You're close to the 5-invoice free limit, so here's how to keep going without missing a beat:

- **Credit packs that never expire** — from $4.99. Pay once, use them whenever. Perfect if you invoice occasionally.
- **Go unlimited** — Pro is $9/mo and Business is $15/mo, with automatic payment reminders so you get paid on time without chasing.

Not sure which fits? Packs are best for light or irregular use; a subscription pays off once you're billing regularly.

**→ See your options** (button → https://invoices.ncgmgroup.com/pricing)

Questions about which plan makes sense? Just reply.

Thanks for using Invoice Generator,
The Invoice Generator team

> **Launch-week only — add this line above the CTA between Aug 4–11:**
> _Launch week: take **30% off** your first purchase with code **LAUNCH30** (first 100 customers)._
> Remove it once the offer ends so the code doesn't linger in the evergreen sequence.

---

## Timing & logic summary

| Email | Trigger | Condition | Purpose |
|-------|---------|-----------|---------|
| 1. Welcome | On signup | Always | Orient + drive first invoice |
| 2. Activation | ~48h after signup | Only if `invoiceCount === 0` | Remove friction to first invoice |
| 3. Upgrade | After 4th invoice (or near limit) | Free plan, not yet paid | Convert to pack/subscription |

**Notes for wiring (later):**
- Emails 2 and 3 are conditional, so they need a trigger that can check invoice count — either a scheduled job (like your reminders cron) that checks daily, or send-time logic. We'll pick the simplest fit when we build it.
- Keep the launch-code line in Email 3 **only** during launch week; the evergreen version omits it.
- All three should send from your verified domain so they land in the inbox (same SPF/DKIM/DMARC you already set up).
