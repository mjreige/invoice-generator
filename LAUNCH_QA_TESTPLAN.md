# Launch QA Test Plan — Invoice Generator

_Run this end-to-end before announcing. Built from the actual gating logic in the codebase (`SubscriptionProvider.tsx`, the API routes, and the RLS hardening applied July 2026)._

**How to use:** work top to bottom. Mark each row **P** (pass) / **F** (fail) / **N/A** in the Result column and jot anything odd in Notes. Anything marked **[SEC]** is a regression check on the security fixes — treat a failure there as a launch blocker. Anything **[$]** requires a real purchase (do these on the pre-wipe test data, or with your comp-admin account where noted).

Legend for tiers: **Free** (no card, 5-invoice lifetime cap) · **Starter** (10 credits, basic) · **Plus** (25 credits, pro features) · **Max** (50 credits, business features but NOT automation) · **Pro** (subscription) · **Business** (subscription).

Key rule to keep in mind while testing: **credit packs unlock *features* but never *automation*.** Max Pack shows business-level features but must **not** unlock payment reminders or custom invoice numbering — those require an active subscription (`isActive`).

---

## 0. Test setup

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 0.1 | Have ready: a fresh email for signup, a second email to receive reminder/invoice emails, a Gmail account for deliverability checks | — | | |
| 0.2 | Confirm you're testing the **live** site `invoices.ncgmgroup.com` and this is pre-DB-wipe test data | — | | |
| 0.3 | Open DevTools → Console + Network before starting, so you can watch for errors and the `consume_credit` RPC | — | | |

---

## 1. Authentication & account

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 1.1 | Sign up with a new email | Account created; confirmation/verification behaves as designed | | |
| 1.2 | Log out, log back in | Session restored; lands on app | | |
| 1.3 | Visit `/invoice`, `/history`, `/profile`, `/manage-subscription` **while logged out** | Redirected to `/login` (protected routes) | | |
| 1.4 | After login via a `?redirect=` link | Sent to the intended page post-login | | |
| 1.5 | Change password (`/change-password`) | Succeeds; old password no longer works | | |
| 1.6 | Log in on a second browser/incognito as a **different** user | Each session sees only its own data (setup for 8.x cross-tenant checks) | | |
| 1.7 | Login page shows **"Forgot password?"** link | Present; routes to `/forgot-password` | | |
| 1.8 | Request reset for a **real** account email | Neutral "if an account exists…" confirmation shown; reset email arrives | | |
| 1.9 | [SEC] Request reset for an email with **no account** | **Same** neutral confirmation (no account-enumeration leak); no error revealing existence | | |
| 1.10 | Reset email deliverability | Lands in Gmail **inbox** (not spam); from your domain; SPF/DKIM/DMARC PASS | | |
| 1.11 | Click the reset link → `/reset-password` | Loads; password rules enforced; setting a valid new password succeeds | | |
| 1.12 | Log in with the **new** password | Works; **old** password no longer works | | |
| 1.13 | Reuse an **already-used** or expired reset link | Shows "invalid or expired" with a link to request a new one | | |
| 1.14 | After reset completes | Recovery session is signed out; you land on `/login` | | |

---

## 2. Free tier & the 5-invoice cap

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 2.1 | As a brand-new free user, create invoices 1–5 | All succeed; PDF downloads each time | | |
| 2.2 | Attempt invoice #6 | Blocked; upgrade prompt shown (`canGenerateInvoice` false at count ≥ 5) | | |
| 2.3 | Confirm free user does **not** see: reminders, custom numbering, Arabic PDF, edit/re-download | All gated off (`effectivePlan==="free"`) | | |
| 2.4 | [SEC] Reload after hitting the cap | Cap persists; not resettable by refresh | | |

> Known residual: the 5-cap is still counted client-side (accepted post-launch item). If you want to confirm the exploit exists, see 8.4 — it's expected to be possible until moved server-side.

---

## 3. Credit packs [$]

Run this block once per pack (Starter, Plus, Max). Purchase happens through Paddle (live).

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 3.1 | Buy the pack via checkout | Paddle overlay is **live** (`buy.paddle.com`); purchase completes | | |
| 3.2 | Return to app | Post-purchase shows **"Credits Added"** (not "Pro"); avatar/home shows the pack name (e.g. "Plus Pack") | | |
| 3.3 | Check credit balance | Matches pack (Starter 10 / Plus 25 / Max 50) | | |
| 3.4 | Create one invoice; watch Network | `consume_credit` RPC fires; balance drops by exactly 1 | | |
| 3.5 | Reload; re-check balance | Decrement persisted (server-side via RPC) | | |
| 3.6 | Feature unlock — **Starter**: only basic invoicing + history | Multi-currency/tax/signature/customers/units all locked | | |
| 3.7 | Feature unlock — **Plus**: multi-currency, tax, signature, line-item templates, customers, units, edit/re-download | All unlocked | | |
| 3.8 | Feature unlock — **Max**: everything Plus + **Arabic PDF** + priority support | Unlocked | | |
| 3.9 | [SEC] **Max Pack must NOT unlock reminders or custom numbering** | Both still locked (require `isActive` subscription) | | |
| 3.10 | Spend the pack to 0 credits | On 0, account reverts to Free rules; blocked if lifetime count > 5 | | |

---

## 4. Subscriptions [$]

Run for **Pro** and **Business**, and test both **monthly** and **annual** at least once each.

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 4.1 | Subscribe (monthly) | Live checkout completes; plan becomes active (`isActive` true) | | |
| 4.2 | Create several invoices | Unlimited; **no** credit decrement (RPC returns unlimited) | | |
| 4.3 | **Pro** features | Everything Plus has **+ automatic payment reminders** available | | |
| 4.4 | **Business** features | Everything Pro **+ Arabic PDF + custom invoice numbering** | | |
| 4.5 | [SEC] **Business Annual** specifically | Classified as **business**, not pro (webhook yearly classification); Business features unlock | | |
| 4.6 | Subscribe **annual** and confirm price | Pro $89/yr, Business $149/yr | | |
| 4.7 | Cancel subscription (`/manage-subscription`) | Cancels only your own sub; access continues until `current_period_end`, then reverts | | |
| 4.8 | [SEC] While cancelled-but-in-period | Still `isActive` until period end (reminders still send) | | |

---

## 5. Core invoice features (run on a Plus/Pro-or-higher account)

| # | Feature | Steps / expected | Result | Notes |
|---|---------|------------------|--------|-------|
| 5.1 | Multi-currency | Pick several of the 25+ currencies; PDF + history show correct symbol/format | | |
| 5.2 | Thousands separators | Amounts render `1,234.56` on form, history, PDF, and emails | | |
| 5.3 | Tax | Set rate + custom label; subtotal/tax/total math correct on PDF and history | | |
| 5.4 | Digital signature | Enable in profile; per-invoice toggle honored; appears on PDF | | |
| 5.5 | Business profile / header | Header toggle per invoice honored | | |
| 5.6 | Line-item templates (saved items) | Save, reuse, edit, delete | | |
| 5.7 | Saved customers | Add, autofill on new invoice, edit, delete | | |
| 5.8 | Custom units | Edit unit list; use in create **and** edit; persists on `business_profiles.custom_units` | | |
| 5.9 | Edit & re-download | [SEC] Gated to paid (`effectivePlan !== "free"`); edit updates values, re-download reflects them | | |
| 5.10 | Discount | Percentage and fixed both compute correctly | | |
| 5.11 | Duplicate invoice number | Blocked with a clear message | | |

---

## 5B. Excel export (History → "Export to Excel")

Gated on `effectivePlan !== "free"` — same gate as edit/re-download. **Note: Starter Pack maps to `effectivePlan="free"`, so Starter users must NOT be able to export.**

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 5B.1 | [SEC] As **Free** user | Button greyed/locked; clicking routes to `/pricing`. No file downloads | | |
| 5B.2 | [SEC] As **Starter Pack** user | Same as Free — export **locked** (Starter is `effectivePlan="free"`) | | |
| 5B.3 | As **Plus / Max / Pro / Business** | Button active; export downloads | | |
| 5B.4 | Export with **no filters** | File contains **all** your invoices, not just the 5 on the visible page | | |
| 5B.5 | Filter by customer, then export | File contains only matching rows | | |
| 5B.6 | Filter by due-date range, then export | File respects both from/to bounds | | |
| 5B.7 | Change sort order, then export | Row order in the file matches the selected sort | | |
| 5B.8 | Open the file in Excel | Opens without repair prompts; sheet named "Invoices" | | |
| 5B.9 | Column check | Invoice #, Customer, Date, Total, Currency — headers in row 1 | | |
| 5B.10 | Total column type | Totals are **numeric** (Excel can SUM them), not text | | |
| 5B.11 | Mixed currencies | Each row shows its own currency; totals are not silently mixed | | |
| 5B.12 | Special characters | Customer names with `&`, `<`, `'`, quotes render correctly (not escaped artifacts) | | |
| 5B.13 | Arabic / RTL customer name | Renders correctly in the sheet | | |
| 5B.14 | Filters matching **zero** invoices | Inline message "No invoices match the current filters"; no empty file downloads | | |
| 5B.15 | Filename | `invoices-YYYY-MM-DD.xlsx` with today's date | | |
| 5B.16 | Large account (optional) | Export with 100+ invoices completes in reasonable time | | |
| 5B.17 | Also open in Google Sheets / LibreOffice | Opens cleanly (cross-tool compatibility) | | |

---

## 6. Automation & templates (subscription-only)

| # | Feature | Steps / expected | Result | Notes |
|---|---------|------------------|--------|-------|
| 6.1 | Reminder defaults UI | [SEC] Visible/editable only when `isActive` (Pro/Business), not for packs | | |
| 6.2 | Per-invoice reminder | Set before/after days on an invoice with a client email + due date | | |
| 6.3 | "Before" reminder fires | On the day `daysUntilDue === before_days`, client gets the "due in N days" email; `sent_before` flips | | |
| 6.4 | "After" reminder fires | On `daysUntilDue === -after_days`, client gets the "overdue" email; `sent_after` flips | | |
| 6.5 | Changing reminder days | Resets the corresponding sent flag so it can send again | | |
| 6.6 | [SEC] Reminder only for active senders | If sender's sub is cancelled+expired, cron does **not** send (re-checked at send time) | | |
| 6.7 | Custom numbering (Business sub only) | [SEC] Available only when `isActive && effectivePlan==="business"` — NOT for Max Pack | | |
| 6.8 | Template tokens | `{PREFIX}`, `{YYYY}`, `{YY}`, `{MM}`, `{SEQ:N}` all render correctly in live preview + on the invoice | | |
| 6.9 | Sequence advance | Each new invoice increments `last_seq`; preview matches generated number | | |
| 6.10 | Yearly auto-reset | Crossing into a new calendar year resets `SEQ` (simulate via `last_year`) | | |
| 6.11 | "Next number" field | Setting the starting sequence takes effect on the next invoice | | |
| 6.12 | Lock (`allow_override=false`) | Per-invoice number field is not hand-editable when locked | | |
| 6.13 | Flip-bug regression | Legacy count-based default does **not** overwrite the template number | | |

---

## 7. Billing lifecycle & refunds [$]

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 7.1 | Refund request — **eligible pack** (<50% used, within 30 days) | Preview shows eligible + summary; on confirm, request email reaches support | | |
| 7.2 | Refund request — **pack >50% used** | Denied with the "more than half used" reason | | |
| 7.3 | Refund request — **outside 30 days** | Denied with the window reason | | |
| 7.4 | Approve a **pack** refund in Paddle | Webhook auto-revokes that pack's credits; at 0 credits user reverts to Free | | |
| 7.5 | Approve a **subscription** refund in Paddle | Access ends **immediately** (`status=cancelled`, `current_period_end=null`) | | |
| 7.6 | Refund idempotency | `adjustment.created` + `adjustment.updated` for the same id revoke **once** only | | |
| 7.7 | Return-to-free after refund | Free rules re-apply; user with >5 lifetime invoices is blocked from new ones (by design) | | |
| 7.8 | Refund policy copy | Matches across pricing FAQ, support banner, and Billing (30-day / 50%) | | |

---

## 8. Security regression checks [SEC] — treat any failure as a launch blocker

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 8.1 | In the browser console as a logged-in user, run: `await supabase.from('subscriptions').update({plan:'business',status:'active',invoice_credits:9999}).eq('user_id', (await supabase.auth.getUser()).data.user.id)` | **Fails** / no rows updated (client UPDATE revoked). Plan does NOT change after reload | | |
| 8.2 | Console: `await supabase.from('subscriptions').select('*')` | Returns **only your own** row (no other users) | | |
| 8.3 | Console: `await supabase.from('invoices').select('*')` | Returns **only your own** invoices | | |
| 8.4 | Console: try `supabase.from('subscriptions').delete()` on any row | **Fails** (no client delete) | | |
| 8.5 | Unauthenticated: hit the REST API with just the public anon key for `/rest/v1/invoices?select=*` | Returns **no** cross-tenant data (empty / only permitted) | | |
| 8.6 | Support form: submit `<b>test</b>` in a field, check the received email | Renders as literal text, not bold (HTML escaped) | | |
| 8.7 | Support form: submit 6+ times quickly from one IP | 6th returns **429** (rate limit) | | |
| 8.8 | Refund request: fire 4+ times quickly | 4th returns **429** | | |
| 8.9 | Response headers on any page (Network tab) | `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` all present | | |
| 8.10 | Cron endpoint `GET /api/cron/reminders` with wrong/no bearer | **401** | | |

---

## 9. Cross-cutting & polish

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 9.1 | Mobile view: view-invoice preview | Line items stack; amounts don't overlap | | |
| 9.2 | Arabic/RTL PDF (Max/Business) | Arabic reshapes + renders right-to-left correctly | | |
| 9.3 | Email deliverability | A reminder lands in Gmail **inbox** (not spam); "Show original" → SPF, DKIM, DMARC all **PASS** | | |
| 9.4 | Reminder email formatting | Amounts, dates, sender/client names render correctly and safely | | |
| 9.5 | Terms & Privacy pages | Load; refund + Paddle-as-merchant language consistent | | |
| 9.6 | 404 / error states | Graceful, no stack traces or secrets leaked | | |
| 9.7 | Console during normal use | No unhandled errors thrown | | |

---

## Sign-off

| Area | Owner | Date | Pass? |
|------|-------|------|-------|
| Auth & free tier | | | |
| Packs & subscriptions | | | |
| Core features | | | |
| Automation & numbering | | | |
| Billing & refunds | | | |
| **Security regression** | | | |
| Deliverability & polish | | | |

Ship only when the **Security regression** row is fully green and no other blocker remains.
