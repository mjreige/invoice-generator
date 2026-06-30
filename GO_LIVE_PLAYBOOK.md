# Invoice Generator — Go-Live Playbook

**Date:** 2026-06-20
**Domain:** invoices.ncgmgroup.com

This playbook has two parts: **A. Technical launch** (what must be true for the app to work and be safe) and **B. Marketing launch** (how to get the first users). Items marked 🔴 are launch-blockers from the QA report.

---

## A. Technical launch

### A1. Blockers — do these first (from QA)

1. 🔴 **Add Paddle webhook signature verification** (QA C1). No real revenue is safe until forged events are rejected.
2. 🔴 **Set all production env vars** (QA C2) — see table below. Without them, billing runs in sandbox or against the wrong catalog.
3. 🔴 **Schedule the reminders cron** (QA C3). Pick one: Vercel Cron (`vercel.json`), GitHub Actions scheduled workflow, or cron-job.org — daily, with `Authorization: Bearer $CRON_SECRET`.
4. 🟠 **Lock down `cancel-subscription`** (QA H1) — require session + ownership.
5. 🟠 **Make the webhook idempotent** (QA H2).
6. 🟠 **Verify RLS policies** on `subscriptions`, `invoices`, `business_profiles` (QA H3).
7. 🟡 **Decide Max Pack vs custom numbering** (QA M1) and either fix the gate or update marketing.

### A2. Environment variables (production)

| Variable | Purpose | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client reads (RLS-scoped) | |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook + cron writes | **Server-only**, never expose |
| `NEXT_PUBLIC_PADDLE_ENV` | `production` | Defaults to `sandbox` if unset |
| `PADDLE_ENV` | `production` | Used by cancel route |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Checkout client token | Remove the `test_…` fallback |
| `PADDLE_API_KEY` | Server API (cancel) | Server-only |
| `NEXT_PUBLIC_PADDLE_PRO_PRICE_ID` / `..._PRO_YEARLY_PRICE_ID` | Pro plans | Production IDs |
| `NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID` / `..._BUSINESS_YEARLY_PRICE_ID` | Business plans | Production IDs |
| `NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID` | Starter pack | Production IDs |
| `NEXT_PUBLIC_PADDLE_PRO_PACK_PRICE_ID` | Plus pack | Production IDs |
| `NEXT_PUBLIC_PADDLE_BUSINESS_PACK_PRICE_ID` | Max pack | Production IDs |
| `RESEND_API_KEY` | Reminder + support email | |
| `CRON_SECRET` | Auth for cron route | Long random string |

> Update `.env.example` to list all of these (QA L5).

### A3. Database & migrations
- Apply all `*_migration.sql` files in Supabase (manual, per project convention).
- Confirm RLS is **enabled** with own-rows policies on `subscriptions`, `invoices`, `business_profiles`.
- Consider a unique index on `invoices(user_id, invoice_number)` (QA L2).

### A4. Billing (Paddle)
- Switch the Paddle account to the **production** environment; create production products/prices; copy IDs into env.
- Register the production webhook URL: `https://invoices.ncgmgroup.com/api/paddle/webhook`; subscribe to `subscription.created/activated/updated/cancelled` and `transaction.completed`.
- Configure tax/checkout settings and confirm the **30-day refund** policy matches the pricing-page copy.

### A5. Email (Resend)
- Verify the `ncgmgroup.com` domain in Resend (SPF, DKIM, DMARC) so `noreply@` and support mail don't land in spam.
- Send one test reminder and one test support message end-to-end.

### A6. Domain, hosting, monitoring
- Point `invoices.ncgmgroup.com` DNS to the host; confirm HTTPS/cert.
- Add error monitoring (e.g. Sentry) and uptime checks on `/` and `/api/cron/reminders` (expect 401 without the secret — that's healthy).
- Confirm security headers and that service-role/API keys are server-only (not in any `NEXT_PUBLIC_` var).

### A7. Pre-flight smoke test (production, low-value real card or sandbox)
Run the **Manual test checklist** in `QA_TEST_REPORT.md` section 4 against the live deploy.

### A8. Rollback plan
- Tag the release commit; keep the previous deploy one click away.
- If billing misbehaves, you can pause new checkouts by reverting price-id env vars; reminders can be paused by disabling the cron schedule (no code deploy needed).

### A9. Launch-day sequence
1. Apply migrations + RLS → 2. Set prod env vars → 3. Deploy → 4. Register webhook → 5. Verify email domain → 6. Smoke test all purchase paths → 7. Enable cron → 8. Announce.

---

## B. Marketing launch

### B1. Positioning
**One-liner:** "Branded, professional invoices in minutes — pay only when you need to, or go unlimited for the price of a coffee."

**Differentiators to lean on:** no-login free tier (5 invoices), credits that **never expire** (vs competitors' forced subscriptions), multi-currency + tax + signatures, and genuine **Arabic/RTL PDF support** (an underserved niche — a real wedge in MENA/freelance markets).

**Primary audiences:** freelancers and solo consultants (Pro), small agencies and SMBs (Business), and Arabic-speaking/bilingual businesses (Max/Business).

### B2. Channels (ordered by leverage for a solo launch)
1. **SEO / content** — highest long-term ROI. Target high-intent terms: "free invoice generator", "invoice generator with Arabic", "multi-currency invoice template", "invoice numbering format". Ship a few cornerstone pages + free invoice templates.
2. **Product directories** — Product Hunt launch, AlternativeTo, SaaS directories, and "free tools" roundups.
3. **Communities** — relevant subreddits (r/freelance, r/smallbusiness), Indie Hackers, freelancer Slack/Discord groups, and MENA freelance communities for the Arabic angle. Be genuinely helpful, not spammy.
4. **Comparison/landing pages** — "vs [competitor]" pages capture bottom-funnel search.
5. **Email** — capture signups, then onboarding + upgrade nudges (you already have Resend wired up).
6. **Paid (later)** — small Google Search budget on high-intent keywords once conversion is proven.

### B3. Launch content checklist
- Product Hunt assets: tagline, gallery images, 60–90s demo GIF/video, first comment.
- 3–5 SEO articles + at least one free downloadable invoice template (lead magnet).
- A short demo video / GIF of creating an invoice → PDF.
- 2–3 "vs competitor" comparison pages.
- Social posts (LinkedIn + X) for launch day with the demo.

### B4. Onboarding & conversion (already supported in-app)
- Free → paid nudge fires at the 5-invoice limit; make sure the upgrade copy is tight.
- Use the welcome modal + GuideMePopup you already built to drive feature discovery.
- Add a simple lifecycle email sequence in Resend: welcome → "here's what you can do" → upgrade nudge near the free limit.

### B5. Metrics to track from day one
- **Acquisition:** visitors, signups, signup→first-invoice rate.
- **Activation:** % who generate ≥1 PDF; time-to-first-invoice.
- **Monetization:** free→paid conversion, credit-pack vs subscription mix, MRR, ARPU.
- **Retention:** repeat invoice creation; subscription churn.
- **Funnel leaks:** checkout-started vs completed (watch for Paddle drop-off).

### B6. Suggested 4-week cadence
- **Week 1:** soft launch to communities + email list; fix anything the smoke test/early users surface.
- **Week 2:** Product Hunt launch + publish cornerstone SEO content.
- **Week 3:** comparison pages + outreach to freelance newsletters/roundups; double down on the Arabic angle.
- **Week 4:** review metrics, start small paid search on the best-converting keywords.

---

## C. Recommended order of operations
1. Fix QA blockers (C1–C3, H1–H3) and decide M1.
2. Configure prod env + Paddle + Resend + DNS.
3. Smoke test every purchase + PDF + reminder path.
4. Soft launch to communities; gather feedback.
5. Big push (Product Hunt + SEO) once stable.

---

## D. Refunds runbook

**Policy (consistent across pricing FAQ, support page, and the Billing button):** 30-day money-back on eligible purchases. Subscriptions are refundable within 30 days; credit packs within 30 days as long as **no more than half** the credits have been used. Thresholds are constants at the top of `app/api/refund-request/route.ts` (`REFUND_WINDOW_DAYS`, `PACK_USED_LIMIT`).

**Prerequisite:** the Paddle webhook destination must be subscribed to `adjustment.created` and `adjustment.updated` (in addition to the subscription/transaction events), or refunds won't auto-revoke.

**The flow:**
1. **Customer requests** — either self-serve from **Billing → "Request a refund"** (the app checks eligibility and emails you a structured request) or by emailing `sales@ncgmgroup.com`.
2. **You action it in Paddle** — Transactions → open the order → **Refund** (full). **For subscriptions, also Cancel the subscription** — refund returns the money, cancel stops future billing; they're two separate actions.
3. **App auto-revokes** — once Paddle marks the adjustment **approved**, the webhook revokes access: packs lose the refunded credits; subscriptions end access **immediately** (status cancelled + period cleared). Acts only on `approved`, and is deduped so it can't double-revoke.

**What "return to free" means:** free-tier rules re-apply — it does **not** grant a fresh 5 invoices. The free cap is a lifetime count of existing invoices, so a customer who already created more than 5 (using credits) is blocked from creating new ones after a refund. They keep their existing invoices (view only). Refunds never delete created invoices.

**Timing:** live refunds are reviewed by Paddle (not instant); card refunds typically land in 3–5 business days.

**Abuse note:** the ≤50%-used pack rule caps refund abuse at half the value while keeping light users happy (avoiding chargebacks). If abuse appears, tighten `PACK_USED_LIMIT` (e.g. to `0` for unused-only).

**Manual override (if ever needed):** to revoke without a Paddle event, in Supabase set the user's `subscriptions` row to `invoice_credits = credits_used` (packs) or `status = 'cancelled', current_period_end = NULL` (subscriptions).
