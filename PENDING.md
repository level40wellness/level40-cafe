# Pending work — Level 40 Café

Last updated 2026-07-22, after Phase 4 (`81aeb5f`).

## Where we are

| Phase | Status |
|---|---|
| 0 — Scaffold (Next 16, TS strict, Tailwind v4, shadcn, zod env, Neon + Drizzle) | done |
| 1 — Schema, migrations, Better Auth, guards + DAL, seed | done |
| 2 — Public site + SEO parity | done |
| 3 — Orders + mock payments | done |
| 4 — Admin console | done |
| **5 — Subscriptions + invoices** | **next** |
| 6 — Go-live | not started |

---

## Phase 5 — Subscriptions + invoices

### What already exists

- `subscriptions` and `invoices` tables, created in Phase 1 and **never yet written to**.
- `meal_plans` is fully editable from `/admin/meal-plans`, with a live subscriber count.
- `/subscription` renders the plans but the call to action deliberately links to
  `/contact` — see the comment at
  [subscription/page.tsx:67](src/app/(site)/subscription/page.tsx#L67). A dead
  Subscribe button would have been worse than an honest one.
- The `PaymentGateway` interface, HMAC-signed webhook, idempotency guard and
  status machine are all real and reusable for recurring payments.

### 5a — Subscription checkout

Mirror `src/server/actions/checkout.ts`: accept a **meal plan id only**, re-read
the price from the database, compute VAT server-side. Snapshot `planName`,
`pricePerPeriodFils` and `durationWeeks` onto the row, exactly as `order_items`
snapshots product name and price — a later price change must not alter what an
existing subscriber pays.

Requires a signed-in user: `subscriptions.userId` is `notNull`, unlike
`orders.userId`, so there is no guest path.

### 5b — Lifecycle

`pending_payment → active → paused / past_due → cancelled / expired` is already
in the enum. Needs: period roll-over (`currentPeriodStart` / `currentPeriodEnd`),
pause and resume, cancel-at-period-end vs cancel-now.

⚠️ The mock gateway has no recurring billing. Either simulate renewals with a
cron route, or defer real renewal to Phase 6 with Stripe. **Decide before
building 5b** — it changes whether `providerSubscriptionId` is used now or later.

### 5c — Customer self-service

`/account/subscription` — view, pause, resume, cancel. `/account/orders`
already exists and sets the pattern.

### 5d — Admin subscriptions

A seventh admin segment. Follows the Phase 4 pattern exactly: query in
`src/server/queries/admin.ts` behind `requireAdmin()`, actions in
`src/server/actions/admin/subscriptions.ts` returning `ActionResult`.

### 5e — Invoices 🔴 blocked on the client

Emailing them is no longer work: `sendEmail` and the branded layout in
[templates.ts](src/server/email/templates.ts) are in place, and
[send.ts](src/server/email/send.ts) marks the seam. Only the document itself is
blocked.

**Blocker: the TRN.** `invoices.trn` is `notNull` and there is no value for it.
An invoice carrying a placeholder TRN is worse than no invoice — it is a
document that misstates a tax registration. Plan: read the TRN from env and
**refuse to issue** when it is unset, rather than substituting anything.

Research done 2026-07-22, **to be confirmed with the client's accountant — this
is not tax advice**:

- A **simplified tax invoice** is permitted when the buyer is not VAT-registered
  in the UAE, *or* is registered and the supply is **AED 10,000 or less**
  (Art. 59(5), VAT Executive Regulations). That covers essentially every café
  order and retail sale here.
- A simplified invoice must show: the words **"Tax Invoice"**, the supplier's
  **name, address and TRN**, and the **date of issue**.
- On a simplified invoice the seller **must not show the net (ex-VAT) value per
  line item** — only the totals. This differs from a full tax invoice, which
  shows tax and net per line. Our `order_items` rows hold `unitPriceFils` and
  `lineTotalFils`, so the *renderer* must decide what to print; the data is fine.
- 🔴 Forward risk: once a business is onboarded to the FTA **e-invoicing**
  system, the simplified format is no longer permitted at all, and every invoice
  must carry the full FTA field set. Worth asking the accountant about the
  client's expected onboarding date before designing the template.

Numbering: `invoices.invoiceNumber` is a Postgres identity column starting at 1,
which gives a gap-free sequence per the legal requirement. Still to decide with
the client: whether the printed number needs a prefix or year segment
(`INV-2026-0001` vs `1`), because that is a policy choice, not a technical one.

---

## Phase 6 — Go-live

1. **Real Stripe gateway** — a new file behind `PaymentGateway`, plus an env var.
   Delete `ALLOW_MOCK_PAYMENTS` at that point.
2. **Vercel Pro** — Hobby prohibits commercial use, and a café taking orders is
   commercial.
3. **Region pinning** — functions to `sin1` to match Neon's `ap-southeast-1`.
   Disable scale-to-zero on the production branch; a cold start adds ~2s to a
   customer's first page load.
4. Monitoring, backups, and a real error reporter.

---

## Client action items still open

### Before deploy

- [ ] **GitHub repo + Vercel project.** Not yet created; the repo is local only.
- [ ] Set Vercel's **Build Command** to `npm run vercel-build`
      (`drizzle-kit migrate && next build`). Preview deploys will migrate
      whatever `DATABASE_URL` they are given — use Neon branching, or scope the
      variable to Production only.
- [ ] Set `BETTER_AUTH_URL` to the production origin. It currently points at
      `http://localhost:3000`, which would put localhost URLs in the sitemap,
      the canonicals and the JSON-LD.
- [ ] Set `ALLOW_MOCK_PAYMENTS=1` until Stripe lands, or checkout 500s in
      production by design.
- [ ] Generate a **new** `BETTER_AUTH_SECRET` for production.
- [ ] **Vercel Blob store** — deferred to deploy day by agreement. Access mode
      **Public** and the region are both permanent choices. Only image upload in
      `/admin` depends on it; the route returns a clear 503 without it.
- [ ] Change the seeded admin password (`IHLcDZ21UO1uwxjC`).
- [ ] Publish the Google OAuth consent screen to "In production"
      (Audience: External).
- [ ] 🔴 **Verify `level40wellness.com` in Resend.** Status is `not_started`,
      added 2026-07-21. Until it verifies, `onboarding@resend.dev` can only
      deliver to the address the Resend account is registered under — every
      other recipient is a 403, so no real customer receives anything. Add
      these three records at the DNS host, then press Verify:

      | Type | Name | Value |
      |---|---|---|
      | TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7+zuralFR53TuWuH8IwyEQ0d6pBELFv9cBUdMtSSn+eRIl8QEVVPJ//o5qAbAw/yxHOxqvNOrhw1uDxim1lGlRsP9rvUfUbAQyoKDSSaPy1xHhnO5K5Bof0nHbxefxx+TZkI8kOI7SwNwgICqtEf7OFs0qVSy7kCswzs1MEQ+tQIDAQAB` |
      | MX | `send` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
      | TXT | `send` | `v=spf1 include:amazonses.com ~all` |

      None of these collide with the Amazon WorkMail records already on the
      domain: the SPF/bounce pair sits on the `send` subdomain and DKIM uses
      its own `resend` selector. Records undetected for 72h flip the domain to
      `failed`; re-adding restarts it.
- [ ] Then set `EMAIL_FROM="Level 40 Cafe <orders@level40wellness.com>"` — the
      **root** domain, not `send.`. That is the only change the app needs.
- [ ] Optional but recommended once verified: a DMARC TXT record at `_dmarc`,
      starting at `v=DMARC1; p=none; rua=mailto:...` so you get reports without
      rejecting anything.
- [ ] Consider flipping `requireEmailVerification` to `true` in
      [auth.ts](src/server/auth.ts) after verification. The OTP handler already
      covers the `email-verification` type, so it is a one-line change.
- [ ] Add the same three email vars to the Vercel project.

### Email — built 2026-07-22, one gap

Resend 6.18.0 is wired: welcome email on signup, and a six-digit OTP password
reset at `/auth/forgot-password`. Sends are fire-and-forget by design — see the
comment on `sendOtpEmail` in [send.ts](src/server/email/send.ts) for why a
delivery failure must not surface to the user, and what that costs.

⚠️ **Not yet rate limited.** `POST /forget-password/email-otp` is public and
sends mail, so it is a quota-burn and spam vector. Better Auth's default
limiter is in-memory, which does not hold across Vercel instances; doing it
properly means `rateLimit: { storage: "database" }` and a new table, so it is
deliberately a separate step with its own migration. **Do this before go-live.**

ℹ️ Adding the `emailOTP` plugin also exposes `POST /sign-in/email-otp`.
`disableSignUp: true` stops it creating accounts, but an existing user can sign
in with an emailed code. There is no option to remove the route.

### Business / legal

- [ ] **TRN** and invoice numbering policy — blocks 5e.
- [ ] **Stripe UAE entity + trade licence** — blocks Phase 6.
- [ ] Legal review of `/privacy` and `/terms`. The refund and cancellation
      section of the terms is still marked `[To be completed by the client]`.
- [ ] Confirm **CSV is acceptable** for bulk catalogue import/export. Excel via
      `xlsx` was dropped: npm's copy is frozen at 0.18.5 and the prototype
      pollution and ReDoS fixes (0.19.3, 0.20.2) do not exist on npm.
- [ ] Migrate the `hello@level40wellness.com` mailbox before **31 Mar 2027** —
      AWS is ending Amazon WorkMail. Set up Amazon SES for transactional mail
      (starts in sandbox; production access must be requested) plus SPF/DKIM.

---

## Notes for whoever picks this up

- Env lives in `.env`, not `.env.local`.
- Scripts that import `@/db` or `@/server/auth` must run with
  `--conditions=react-server`, and `tsx` resolves `.ts` as CJS here, so **no
  top-level await** — wrap in an async `main()`.
- ⚠️ Never run `shadcn init` in this repo; in shadcn 4.x it is create-project
  mode and will scaffold over the app. Use `npx shadcn@4.13.1 add <name>`.
- ⚠️ Never run `npm audit fix --force` — it wants to install `next@9.3.3`.
- A `"use server"` module may only export **async** functions. Shared lookup
  tables both sides need go elsewhere, e.g. `src/lib/order-status.ts`.
- `src/styles/level40.css` is a verbatim port of the client's hand-written CSS
  and should stay diff-clean. New admin styles go in `src/styles/admin.css`.
