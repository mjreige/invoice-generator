# Security & Readiness Review — Invoice Generator

_Pre-launch review, July 8 2026; updated July 9 after remediation. Reviewed at repo `main`._

## Status legend
- ✅ **RESOLVED** — fix applied and verified this session
- ⏳ **ACTION ON YOU** — fix drafted, you need to run/deploy it
- 🔵 **OPEN** — accepted follow-up, not yet actioned

## TL;DR

The billing hardening done in the launch-prep session was genuinely good: the Paddle webhook does signature verification with a timing-safe compare, idempotency is real, the IDOR on cancel is fixed, and the refund revoke path is thought through.

But the RLS review surfaced **two critical database-layer holes** — a cross-tenant data breach and a self-serve plan escalation — that together meant any visitor could read every customer's data and any logged-in user could grant themselves a paid plan for free. **Both are now fixed** (SQL applied to Supabase + `rls_hardening_migration.sql` committed). The application-layer fixes (email escaping, rate limiting, security headers, server-side credit consumption) are also applied. What remains is `npm audit fix` and deploying the code.

---

## Critical

### 1. Cross-tenant data exposure via mis-scoped RLS policies ✅ RESOLVED
`subscriptions` and `invoices` each carried a policy named *"Service role can manage all…"* but defined `TO public` with `USING (true)`. Because `roles = {public}` applies to **every** role (`anon` + `authenticated`) and RLS combines permissive policies with OR, the effective row check for any caller collapsed to `true` for **all rows**. Since the `anon` key ships publicly in the browser bundle, anyone could query `…/rest/v1/invoices?select=*` and read **every customer's invoices** (names, emails, amounts) and subscriptions **with no login**; authenticated users additionally held DELETE, so they could wipe or tamper with all rows.

**Fix applied:** dropped both "manage all" policies (the service-role key bypasses RLS and never needed them), leaving only correctly-scoped per-user policies (`auth.uid() = user_id`); revoked the stray DELETE/TRUNCATE/etc. grants from `anon`/`authenticated`. Verified: no policy with `qual = true` remains on either table. Captured in `rls_hardening_migration.sql`.

### 2. Client-side paywall / self-escalation of plan & credits ✅ RESOLVED
Quota was enforced only in the browser (`app/invoice/page.tsx` + `components/SubscriptionProvider.tsx`), and `authenticated` held column-level `UPDATE` on **every** `subscriptions` column with a permissive UPDATE policy. A user could run one line in dev tools to set `plan='business'`, `status='active'`, `invoice_credits=9999`, or reset `credits_used=0` — free Business forever.

**Fix applied:** dropped the client UPDATE/INSERT policies and revoked the INSERT/UPDATE grants on `subscriptions` (service role writes it exclusively now). Credit consumption moved to an atomic `SECURITY DEFINER` DB function `consume_credit()` (increments only when a credit is available), called from `invoice/page.tsx` via `supabase.rpc("consume_credit")` with an error check that blocks invoice creation if the credit can't be confirmed.

**Residual (🔵 OPEN):** the free **5-invoice lifetime cap** is still only counted client-side; `invoices` INSERT is RLS-scoped to the owner but has no row-count limit, so a determined free user could insert more than 5. Closing it needs a server route or a row-count trigger — lower urgency than the escalation/breach, flagged for a follow-up decision.

---

## High

### 3. Dependency vulnerabilities (2 critical, 1 high per `npm audit`) ⏳ ACTION ON YOU
`npm audit --omit=dev` reports 8 issues including a **high** in `ws` (memory disclosure / DoS) and criticals pulled in transitively. `resend → svix → uuid` and `next → postcss` are the chains. Run `npm audit fix` and re-run `npx tsc --noEmit` + a smoke test before launch. These are one-line fixes and worth clearing before you announce.

### 4. Unauthenticated, unthrottled email endpoints ✅ RESOLVED
`app/api/support/route.ts` was public (no auth), took `name/email/subject/message`, and emailed `sales@ncgmgroup.com` with no rate limit — a scriptable inbox-flood / Resend-quota-burn open relay. `refund-request` was authenticated but unthrottled.

**Fix applied:** added an in-memory limiter (`lib/rateLimit.ts`) — support capped at 5/hour/IP, refund at 3/hour/user, both returning `429` over the limit. A CAPTCHA on the public support form remains a good follow-up (🔵 OPEN).

---

## Medium

### 5. HTML injection into outbound emails ✅ RESOLVED
Templates interpolated user-controlled values straight into HTML with no escaping: `cron/reminders` put sender-controlled `client_name`/`sender_name`/`invoice_number` into the email sent **to the client** (a phishing primitive on your `noreply@ncgmgroup.com` reputation); `support` and `refund-request` injected `name`/`subject`/`message`/`email` into mail to your inbox.

**Fix applied:** added `lib/escapeHtml.ts` and wrapped every interpolated user value across all three email routes.

### 6. No security headers ✅ RESOLVED
`next.config.mjs` only set `Cache-Control: no-store` on every route (also needlessly killing static-asset caching). No `X-Frame-Options`, `nosniff`, `Referrer-Policy`, or HSTS.

**Fix applied:** added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS (2yr, preload), and `Permissions-Policy`; scoped `no-store` off static assets. A tuned **`Content-Security-Policy`** (allow-listing GA + `*.paddle.com` + Supabase) is still worth adding and testing — deliberately left out for now to avoid breaking checkout/analytics (🔵 OPEN).

### 7. Refund revoke uses a heuristic, not the refunded amount 🔵 OPEN
In the webhook, pack refunds subtract a **fixed** pack size based on the *current* `pack_type` (`webhook/route.ts:261-263`), and subscription refunds cancel immediately. Edge cases: a user who bought two packs gets only one pack's credits removed; a partial refund revokes a full pack; `credits_used` isn't reconciled. It's documented as a heuristic and is acceptable for launch volume, but log these and reconcile manually until you can key the revoke off the adjustment's actual line items.

---

## Low / hygiene

- ✅ **Stray files removed:** `app/page.tsx.old`, `app/api/paddle/webhook/route.ts.old` (the `.old` webhook had a service-key-**or-anon-key** fallback), and the dead `app/invoices/` duplicate route — all deleted this session.
- 🔵 **Hardcoded price-ID fallbacks** in the webhook (`webhook/route.ts:86-91`). Harmless if env is set, but if an env var is ever missing in prod the code silently falls back to specific live IDs and mis-grants. Prefer failing loudly when a price ID env is absent. (Left as-is pending your call.)
- **`.env.local` is present in the working tree.** It's gitignored (good) and not in git history (I checked). Just don't let it leak into any build artifact or screenshot.
- **Console logging of webhook bodies** (`console.log("Webhook received", ...)`). `removeConsole` strips these in prod except `error`/`warn`, and some `console.error`s include Supabase error objects — fine, just be aware error logs may carry identifiers.

---

## Feature assessment & product opinion

**What's strong.** For a solo/small-team invoicing SaaS this is a genuinely complete v1: multi-currency, tax, signatures, saved customers, line-item + unit templates, Arabic/RTL PDF, edit/re-download history, automatic reminders, and custom numbering templates is a real differentiator most cheap tools don't have. The dual monetization (credit packs *and* subscriptions) is smart for a market that's allergic to subscriptions, and the `effectivePlan` vs `isActive` split (Max Pack gets Business features but not the automation gates) is a clean way to model it. The refund system — self-serve eligibility check + automatic revoke on Paddle approval — is more than most launches ship with.

**What I'd enhance (post-launch, priority order).**
1. **Close the residual free-cap gap** (finding #2 residual) — the 5-invoice lifetime cap is still client-side counted; make it server-authoritative so the now-fixed paywall holds fully.
2. **The core gap: you generate invoices but don't get them paid.** There's no "pay this invoice" link for the *recipient*. Adding a hosted-payment / "Pay now" link (Stripe/Paddle checkout or even a bank-details block) would move you from "invoice PDF maker" to "get paid faster," which is the pitch that justifies a subscription.
3. **Reminders granularity** — currently one before/after pair per invoice. Multiple staged reminders (e.g. -3, 0, +7, +14) and a per-user default schedule would be a natural Pro upsell.
4. **Deliverability/observability** — no dashboard for whether reminder emails actually landed. Wire Resend webhooks (delivered/bounced/complained) so a bounced client email doesn't silently fail.
5. **Data export** (CSV of invoices) and **basic reporting** (outstanding vs paid totals) — cheap to add, high perceived value.

**Cons / risks to be honest about.** Reminders depend on client email being correct and on your domain's sender reputation — one spammy sender can hurt everyone (email-injection now escaped, but content is still sender-authored). The lifetime 5-invoice free cap is still counted client-side (finding #2 residual) and remains resettable until moved server-side. And you're single-region single-repo with manual SQL migrations — fine now, but the manual-migration habit is how the "apply these two before launch" footgun in your own playbook happens.

---

## Launch steps you may have missed

Beyond what's already in your playbook (apply the two migrations, smoke tests, Resend SPF/DKIM/DMARC, comp-admin row):

- ✅ **RLS hardening** (findings #1, #2) — applied; also apply `rls_hardening_migration.sql` on any environment rebuilt from scratch (e.g. after the planned DB wipe).
- ⏳ **`npm audit fix`** (finding #3) before the announcement.
- ✅ **Rate-limit the support/refund endpoints** (finding #4) — applied.
- ⏳ **Deploy the code changes** — the RLS SQL is already live, so deploy the new code promptly (the old client-side credit write now fails silently until you do).
- 🔵 **Legal/compliance:** you have Privacy and Terms pages — confirm they name Paddle as Merchant of Record (Paddle handles VAT/sales-tax, which is a selling point) and that your refund policy copy matches the 30-day / 50%-pack logic actually enforced in code. GDPR: a **data-deletion path** for account/data removal (right to erasure) — right now deletion looks like a manual SQL job.
- **Backups & recovery:** confirm Supabase point-in-time recovery / scheduled backups are on. Your plan is to *wipe the DB* at launch — make sure that's the throwaway test data and that PITR is enabled the moment real customers exist.
- **Monitoring/alerting:** error tracking (Sentry) and an alert if the reminders cron fails or the webhook starts 401-ing (you already hit a webhook-secret misconfig once — you want to know immediately if it recurs).
- **Webhook retry/dead-letter:** you fail-closed on idempotency-insert errors (good), but there's no alert if Paddle events start failing. Add one.
- **A real staging environment** — right now prod auto-deploys on push to `main` with no preview gate. At minimum protect `main` and use Vercel preview deployments for verification before promoting.
- **Uptime check** on `invoices.ncgmgroup.com` and the webhook endpoint.

---

## Verified during remediation
- ✅ **RLS policies** on `subscriptions` and `invoices` dumped from Supabase, confirmed the two critical holes, fixed, and re-verified (no `qual = true` policy remains; `subscriptions` is SELECT-own only; `invoices` per-user only). `business_profiles` was already correctly scoped.

## Still on you to confirm (outside the repo)
- **Vercel Production env vars** actually set (can't see the dashboard) — especially the live Paddle price IDs and secrets.
- **Supabase PITR / backups** enabled before real customers exist (relevant given the planned DB wipe).
- Run **`npm audit fix`** and **deploy** the committed code.
