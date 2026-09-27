# amzn.clone

An Amazon-style store built in two phases: a 24-hour clone (Phase 1), then extended with real auth, accounts, reviews, coupons and an admin dashboard (Phase 2).

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Auth.js v5 · Drizzle ORM · Neon Postgres · Zustand · Vitest.

**Live:** _add your Vercel URL here_

---

## Quick start

```bash
npm install
cp .env.example .env.local      # then fill it in (see below)
npm run db:migrate              # create/upgrade the schema
npm run db:seed                 # catalog + demo accounts + demo orders/reviews (safe to re-run)
npm run dev                     # http://localhost:3000
```

Checks: `npm test` (unit tests) · `npm run lint` · `npm run typecheck` · `npm run build`.

### Environment variables

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | Neon Postgres. Vercel sets it when the Neon store is connected. |
| `AUTH_SECRET` | sessions | Any long random value (`npx auth secret`). |
| `AUTH_TRUST_HOST` | `next start` outside Vercel | `true` locally; Vercel trusts its host automatically. |
| `APP_URL` | emailed links | The site's origin. Required in production: links are never built from the request's Host header (that would allow poisoned reset links). |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` | activation & reset emails | Ethereal test inbox: `npm run email:ethereal` prints ready-to-paste values. Locally without SMTP, emails are printed to the server console. |
| `DEV_FIXED_OTP` | **temporary test mode** | If set (e.g. `123456`), no email is sent and activation/reset accept that code. **Insecure, see below.** |
| `AUTH_GITHUB_ID` `AUTH_GITHUB_SECRET` | GitHub sign-in | Optional; the button appears only when both are set. Callback: `<APP_URL>/api/auth/callback/github`. |
| _(image uploads)_ | review photos, product images | **None needed.** Images are stored in Postgres and served from `/api/images/:id`, so there's no third-party storage to configure. |

### Demo accounts (created by the seed)

| Account | Password | What it shows |
|---|---|---|
| `admin@amzn.clone` | `Admin12345` | Admin dashboard |
| `shopper@amzn.clone` (Sam) | `Shopper12345` | Orders in every state, an approved return, reviews, a wish list, 2 saved cards |
| `riley@amzn.clone` | `Riley12345` | Verified review, a pending return request, helpful votes |
| `jordan@amzn.clone` | `Jordan12345` | A review **without** Verified Purchase (no orders) |

Coupons: `WELCOME10` (10% off up to $50, once per customer; unused by Sam), `SAVE20` ($20 off $100+), `EXPIRED5` (shows the expired message).

The seed is targeted: it removes test fixtures (users `@example.com`, non-demo products/categories/coupons) and the demo accounts' activity, then rebuilds the demo set. Other accounts are left alone.

### Demo video script (3–5 min)

1. **Sign in** as `shopper@amzn.clone`.
2. **Admin creates a product:** sign in as admin → Admin → Products → New product → fill in, upload an image, Create → "View in store".
3. **Checkout with a coupon** (as Sam): search, open a product, Add to Cart → Cart → Proceed to checkout → address → card → apply `WELCOME10` (try `EXPIRED5` first to show the rejection) → Place your order → confirmation.
4. **Leave a review:** open **Apple iPhone Charger** (Sam bought it, hasn't reviewed it) → Write a review with a photo → it shows **Verified Purchase**. On **iPhone 13 Pro**, compare Sam's and Riley's verified reviews with Jordan's (no badge), and mark one Helpful.
5. **Request a return:** Your orders → the newest **Delivered** order → Return items → pick an item and a reason → it appears under Account → Returns as *Requested*; as admin, approve it on the order page.

---

## What's in it

**Phase 1 (required pages):** home (category tiles + top-rated rail), search with category filter, product detail, cart, checkout, order history.

**Phase 2:**

- **Auth (Auth.js):** email + password with **email activation**, **forgot/reset password** via single-use emailed links, sign-out, change password. GitHub OAuth is wired in (see *Incomplete*). Route guards on `/cart`, `/checkout`, `/orders`, `/account`, `/admin`.
- **Roles & admin** (`/admin/dashboard`): overview; **orders** (search, status filter, status changes, return approvals); **products** (CRUD with image upload; ordered products are archived instead of deleted); **categories** CRUD; **coupons** CRUD.
- **Account:** address book (add/edit/delete/default), payment methods (mock cards: add/delete/default), wish list (add/remove/move to cart), change password, order history with status filter, returns (request + status).
- **Reviews:** 1–5 stars, text, up to 3 photos; **Verified Purchase**; one review per user per product (resubmitting edits it); **Helpful** toggle (not on your own review); sort by recent/helpful; rating summary.
- **Checkout:** multi-step: address → payment → review (coupon applied, server-computed quote) → place order → confirmation.

---

## Security: how each required rule is met

| Requirement | How | Where |
|---|---|---|
| **Admin role checked from the DB on every admin request** | The JWT carries only the user id and sign-in time. `getCurrentUser()` re-reads the user row (role, verification, password-change time) on every request; `withAdmin()` / `requireAdmin()` use it. Non-admins get **404**. Promoting or demoting a user in the DB takes effect on an *existing* session's next request (tested). | `src/server/dal.ts`, `src/server/http.ts` |
| **Route guards** | Proxy does optimistic redirects from the cookie; the real check is `requireUser()` in every protected page and `withUser()` in every API route (layouts are never used as guards). | `src/proxy.ts`, `src/server/dal.ts` |
| **Prices/totals/discounts server-side** | The cart stores only product + quantity. Prices come from `products` when the cart is read and again inside the order transaction; the coupon discount is recomputed under a row lock; refunds are computed from what was paid. Client-sent prices/totals/discounts are stripped by the request schemas and ignored. | `cartService`, `orderService`, `couponService`, `returnService` |
| **Other users' resources return 404** | Every query for orders, returns, addresses, cards, cart, wish list and reviews filters on the session user id *inside the query*, so someone else's id is indistinguishable from a missing one. Using another user's address/card to place an order is also a 404. | `src/server/*Service.ts` |
| **Paid once; stock decremented once** | Payment is one transaction: a conditional `UPDATE … WHERE status = 'pending_payment'` (a second payment matches zero rows) plus stock decrements guarded by `stock >= qty`; any shortfall rolls it all back. DB check constraints forbid negative stock. Order creation is idempotent (client key + unique index). Tested with concurrent requests: 6 simultaneous payments → 1 success; last unit, 2 buyers → 1 success. | `src/server/orderService.ts` |
| **Passwords hashed, never returned** | scrypt (N=2¹⁵) with per-password salt via `node:crypto`; hash never selected into responses (scanned in tests). Sessions issued before a password change/reset are revoked. | `src/server/password.ts` |
| **Search/filter input sanitized** | Control chars stripped, length/term caps, `%`/`_`/`\` escaped for `ILIKE`, slug/enum validation for category and status filters, bound parameters throughout. | `src/domain/search.ts`, `parseOrderStatus` |

Also: enumeration-safe register/forgot responses; single-use SHA-256-hashed email tokens; activation on a button press (so link scanners can't consume tokens); `callbackUrl` limited to same-site paths; uploads type-checked from the file's bytes (JPEG/PNG/WebP, 2 MB) and served with `nosniff` + sandbox CSP; review text rendered as plain text; card numbers reduced to brand + last 4 (full number never stored).

---

## Architecture

Components render state and forward events; they don't decide anything. Rules live in pure functions.

```
src/
  domain/      Pure TypeScript rules, no I/O: cart quantities, pricing & order drafts, coupons,
               returns (eligibility, remaining qty, pro-rated refunds), reviews, card validation,
               search sanitizing, admin transitions/validators. Unit-tested.
  db/          Drizzle schema (with CHECK constraints and partial unique indexes) + client.
  server/      Server-only: data access layer (auth checks), one service per area, admin
               services, HTTP helpers (withUser/withAdmin, error -> status mapping).
  app/api/     Thin route handlers: parse input (zod) -> service -> JSON.
  data/        Client repositories over the HTTP API.
  state/       Client state and hooks (Zustand stores for cart/wish list, useAsync for
               loading/error/success + retry, form hooks that call domain validators).
  components/  Presentational components.
  app/         Pages. Protected pages are small server components that call requireUser()/
               requireAdmin() and render a client view.
drizzle/       SQL migrations.  scripts/  seed + Ethereal helper.
```

Loading, error and empty states are handled on every data view (spinners, errors with *Try again*, empty-state messages), plus a route-level error boundary.

---

## Testing

- **Unit (`npm test`):** 64 tests over the domain rules: pricing, coupons, returns, card validation, search sanitizing, admin transitions/validators, auth helpers, password hashing.
- **End-to-end (run during development, not committed):** headless-Chrome and API scripts run against the production build, covering the flows above and the security rules: IDOR attempts, tampered prices/discounts/refunds, concurrent payments and coupon redemptions, DB-driven role changes, upload spoofing, XSS in reviews. They live outside the repo because they use a local Chrome and write to the database; see *With more time*.

---

## Incomplete, and why

| Item | Status / reason |
|---|---|
| **GitHub OAuth** | Implemented and switched on by env vars, but **not configured** on the deployment (skipped by choice). Only credentials sign-in is live. |
| **Email delivery on the deployment** | Emailed links work locally via Ethereal SMTP. On the deployment, SMTP wasn't working in time, so **`DEV_FIXED_OTP` test mode** may be on: activation/reset use a fixed code. That mode is deliberately insecure (anyone who knows an address can reset its password) and doesn't meet "emailed link"; unset it once SMTP works. |
| Payments | Simulated; card numbers are validated (Luhn, brand length, expiry) and only brand/last 4 are kept. A real integration would use a provider tokenizer so the number never reaches the server. |
| Refunds | Return status moves to *refunded*; no money actually moves. |
| Coupon holds | A coupon use is reserved when the order is created; an unpaid order holds it until an admin cancels the order (which releases it). |
| Rate limiting | None on sign-in/register/reset. |
| Orphaned uploads | Images uploaded but never attached aren't cleaned up. |
| Pagination | Admin lists cap at 200/500 rows; reviews at 100 per product. |
| Visual polish | Functional Tailwind UI; polish was the lowest priority. |

## With more time

1. Commit the end-to-end suites (Playwright) against a disposable database, and run them in CI.
2. Real email (Resend/Postmark) and GitHub OAuth on the deployment; remove the test-code mode.
3. Rate limiting and lockout on auth endpoints.
4. A real payment provider (tokenized cards, webhooks, actual refunds); expire unpaid orders and release their coupon holds automatically.
5. Pagination everywhere; server-rendered catalog pages for first paint/SEO.
6. Image storage on object storage/CDN instead of Postgres once volume grows; clean up orphaned uploads.
7. UI polish and an accessibility pass.

---

## Phase 1 notes (24-hour version)

Phase 1 kept the cart in localStorage and orders in a mock repository, cut login/wishlist/reviews/multi-step checkout as instructed, and kept one filter (category). Phase 2 replaced the mocks with server-side, user-scoped data while keeping the same layering (the Phase 1 domain/state split carried over).

## Process notes

Built with Claude Code (Claude Opus 5.5). Prompts and responses are in `.agent-logs/`; the capture setup is described in `CAPTURE-TEST.md`. Commits follow the order the work was done.
