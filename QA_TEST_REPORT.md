# Invoice Generator — Pre-Launch QA Report

**Date:** 2026-06-20
**Scope:** Full code-level audit + type-check of the repo prior to go-live. No live payments or emails were triggered (those are left as a manual checklist below).
**Build gate:** `npx tsc --noEmit` → **PASS (clean, 0 errors)**. A full `next build` was not run (impractical in this sandbox, per project brief).

---

## 1. Testing plan

| # | Area | What was checked | Method |
|---|------|------------------|--------|
| 1 | Build/type safety | Whole-repo type check | `tsc --noEmit` |
| 2 | Core invoicing | Line items, quantity/price, discount, totals math | Code review of `app/invoice` |
| 3 | PDF generation | Currency symbols, tax block, signature, paging, Arabic | Code review of `lib/pdf.ts` |
| 4 | Plans & gating | `effectivePlan`/`isActive` gates per feature | Cross-file trace |
| 5 | Billing | Paddle checkout, webhook, credit packs vs subscription | Code review `lib/paddle.ts`, webhook |
| 6 | Automation | Reminder cron, sent-once tracking, invoice numbering | Code review of cron + `lib/invoiceNumberTemplate.ts` |
| 7 | Data features | Customers, units, history edit/re-download, profile | Code review |
| 8 | Auth | Login, signup validation, change-password | Code review |
| 9 | Marketing surfaces | 4-surface rollout consistency, recurring-invoices removal | Grep + review |
| 10 | Security/config | Webhook auth, cron auth, IDOR, env/secret handling, RLS reliance | Code review |

---

## 2. Results by functionality

| Feature | Status | Notes |
|---------|:------:|-------|
| Type check (`tsc`) | ✅ Pass | Clean |
| Invoice creation + line items | ✅ Pass | UUID rows, add/remove, unit field present |
| Totals math (subtotal → discount → tax → grand) | ✅ Pass | Discount capped at 100%; tax applied on net-after-discount; floors at 0. Form math matches PDF math. |
| PDF output (currency, tax line, signature, multi-page) | ✅ Pass | Correct symbol prefix, conditional tax/discount breakdown, page numbering |
| Multi-currency | ✅ Pass | Gated to Plus pack / Pro+; symbol correct on form + PDF |
| Tax (rate + label) | ✅ Pass | Gated `effectivePlan !== "free"`; stored on invoice for history accuracy |
| Digital signature | ✅ Pass | Gated `effectivePlan !== "free"`; needs name + toggle |
| Line item templates / saved items | ✅ Pass | Gated to Pro/Business effective plan; per-currency price clearing |
| Saved customers | ✅ Pass | Stored on `business_profiles.saved_customers` |
| Custom units (create + edit) | ✅ Pass | All plans; editable in both flows; `business_profiles.custom_units` |
| Invoice history + edit | ✅ Pass | Edit does **not** consume a credit; create has duplicate-number check |
| Credit consumption | ✅ Pass | Increments `credits_used` only on create when on credits (not subscription) |
| Payment reminders (attach to invoice) | ✅ Pass | Correctly gated on `isActive` (subscription-only) |
| Invoice numbering template | ⚠️ Caveat | Works + yearly reset + seeds from current-year count. **Over-granted to Max Pack** — see Finding M1 |
| Arabic / RTL PDF | ⚠️ Caveat | Reshaping works; gated to `business` effective plan. `bidi-js` dep unused; Arabic is left-aligned — mixed RTL ordering may be imperfect (Finding L4) |
| Auth (login/signup/change-pw) | ✅ Pass | Signup field + password-rule validation; change-pw re-verifies current password |
| 4-surface marketing rollout | ✅ Pass | Pricing, landing, UpgradePopup, GuideMePopup consistent; welcome modal covers pro/business/credits |
| Recurring-invoices removal | ✅ Pass | Zero references remain in code |
| Migrations vs code columns | ✅ Pass | All referenced columns covered by `*_migration.sql` |
| Paddle webhook security | 🔴 Fail | No signature verification — see C1 |
| Cancel-subscription endpoint | 🔴 Fail | No auth/ownership check (IDOR) — see H1 |
| Production billing config | 🔴 Fail | Defaults to sandbox + hardcoded test creds — see C2 |
| Reminder scheduler | 🔴 Fail | No cron is configured to call the route — see C3 |

---

## 3. Findings (by severity)

### 🔴 Critical — must fix before go-live

**C1. Paddle webhook has no signature verification.**
`app/api/paddle/webhook/route.ts` accepts any JSON POST and writes subscriptions/credits using the service-role key. Anyone who finds the URL can forge `subscription.activated` / `transaction.completed` events and grant themselves unlimited access for free. **Fix:** verify the `Paddle-Signature` header (HMAC) against your Paddle webhook secret before processing; reject on mismatch.

**C2. Billing defaults to sandbox + hardcoded test credentials.**
`lib/paddle.ts` falls back to a `test_…` client token and `environment = 'sandbox'`; the webhook and pricing page contain hardcoded fallback **price IDs** and `PADDLE_ENV` defaults to `sandbox`. If any production env var is missing, real checkout silently runs against sandbox (no real money) or the wrong catalog. **Fix:** set `NEXT_PUBLIC_PADDLE_ENV=production`, `PADDLE_ENV=production`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY`, and all `NEXT_PUBLIC_PADDLE_*_PRICE_ID` to production values. Remove or guard the hardcoded fallbacks.

**C3. No reminder cron is scheduled.**
`app/api/cron/reminders/route.ts` exists and is auth-gated by `CRON_SECRET`, but nothing triggers it (no `vercel.json`, no external scheduler). Reminders will never send in production. **Fix:** add a daily scheduler (Vercel Cron, GitHub Actions, or cron-job.org) that GETs the route with header `Authorization: Bearer $CRON_SECRET`.

### 🟠 High

**H1. `cancel-subscription` IDOR — no auth/ownership check.**
`app/api/cancel-subscription/route.ts` takes `subscriptionId` from the request body and cancels it at Paddle + marks it cancelled in the DB using the **service-role key**, with no session check. A caller who knows/guesses another user's `paddle_subscription_id` can cancel their plan. **Fix:** require the user's session, look up their own subscription, and only cancel if `paddle_subscription_id` belongs to them.

**H2. Webhook is not idempotent (double-credit risk).**
`transaction.completed` adds credits on every call; Paddle retries deliver the same event more than once, so a single purchase can grant credits multiple times. **Fix:** record processed Paddle event/transaction IDs and skip duplicates.

**H3. Row-Level Security must be verified.**
The client reads `subscriptions`, `invoices`, and `business_profiles` directly with the anon key, filtered by `user_id`. This is only safe if RLS policies restrict each user to their own rows. If RLS is off → data leak; if RLS is on but policies are missing → app reads return empty and break. **Fix:** confirm RLS policies on all three tables before launch.

### 🟡 Medium

**M1. Max Pack over-grants custom invoice numbering.**
Custom numbering is gated on `effectivePlan === "business"`, and a Max Pack purchase (`business_pack`) maps to `effectivePlan = "business"`. So Max Pack buyers get custom numbering, which pricing/landing/guide all reserve for **Business Monthly only**. Arabic correctly belongs to Max Pack; custom numbering does not. **Fix:** either gate numbering on `isActive && effectivePlan === "business"`, or add it to Max Pack marketing. (Decision needed — see questions at end.)

**M2. Reminders aren't re-validated at send time.**
The cron sends for any invoice with `reminders.enabled = true`, regardless of the sender's *current* subscription status. A user who cancels keeps sending reminders from their old invoices indefinitely. **Fix:** join `subscriptions` (or check active status) in the cron before sending.

**M3. Reminder-defaults UI shows for credit-pack users.**
The profile reminder-defaults section is gated on `!isFree`, so Plus/Max pack buyers (effective pro/business) see and can toggle it — but reminders only attach when `isActive`, so it silently does nothing for them. Cosmetic/confusing. **Fix:** gate the reminder-defaults block on `isActive`.

### 🟢 Low / cleanup

- **L1.** Cron uses exact-day equality (`daysUntilDue === before_days`). If a daily run is missed, that day's reminder is skipped permanently. Consider `<=` combined with the sent-flag.
- **L2.** Invoice-number uniqueness is enforced only in app code (race-prone). Consider a DB unique constraint on `(user_id, invoice_number)`.
- **L3.** `/invoices` route and `app/page.tsx.old` look like dead duplicates (`/history` is the canonical, linked route). Remove to avoid confusion — do **not** commit `.old`.
- **L4.** `bidi-js` is a dependency but isn't used in `lib/pdf.ts`; Arabic is reshaped but left-aligned, so mixed-direction lines may not order/align perfectly.
- **L5.** `.env.example` only lists Supabase URL/anon key — missing Paddle, Resend, `CRON_SECRET`, and service-role keys. Update it so deployments are reproducible (see playbook env table).
- **L6.** `support` endpoint has no rate limiting and interpolates user input into HTML unescaped (low risk — goes to your own inbox).
- **L7.** History edit/re-download buttons aren't plan-gated. Confirm whether re-download from history should be a Plus+ feature or is intentionally open (Free plan does list "PDF download" + "Invoice history").

---

## 4. Manual test checklist (things only you can safely verify live)

Run these in a Paddle **sandbox** project (or with sandbox keys) before flipping to production:

1. **Signup → login → logout → protected-route redirect** (`/invoice`, `/history`, `/profile` should bounce to `/login` when signed out).
2. **Free limit:** create 5 invoices, confirm the 6th is blocked with the upgrade prompt.
3. **Each purchase path** (Starter, Plus, Max, Pro monthly, Business monthly, both annual): complete checkout → confirm webhook fires → confirm `subscriptions` row + correct `effectivePlan` + welcome modal.
4. **Feature unlocks** after each purchase: multi-currency, tax, signature, templates, customers (Plus+); Arabic (Max + Business); reminders (Pro/Business only); custom numbering (Business — and decide Max Pack per M1).
5. **Reminders end-to-end:** create an invoice with a near due date + client email, trigger the cron manually with the Bearer secret, confirm one email arrives and the sent badge appears; confirm it doesn't resend.
6. **Cancel subscription** from `manage-subscription`, confirm access persists until period end then drops.
7. **PDF spot-check:** generate PDFs with discount, tax, signature, multi-page, and an Arabic line item; eyeball layout.
8. **Refund/30-day policy** copy matches your actual Paddle refund settings.
