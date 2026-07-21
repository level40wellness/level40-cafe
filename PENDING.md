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
