# amzn.clone: 24-hour Amazon clone

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zustand.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # domain unit tests (vitest)
npm run lint && npm run typecheck && npm run build
```

## The required flow

**Search → product detail → Add to Cart → cart → checkout (address + Place Order) → confirmation → order history.**

This was verified end to end in real (headless) Chrome against the production build. The run included closing and relaunching the browser between steps, which proved that the cart and the orders survive a restart. It also checked the empty-search, missing-product and empty-cart states, and confirmed there were no console errors.

## Architecture

The rule I held to: components render state and forward events. They don't decide anything.

```
src/
  domain/      Pure TypeScript. Types, cart rules (merge lines, stock/qty caps, subtotal in
               integer cents), address validation, order building, search matching.
               No React, no I/O. This is what the unit tests cover.
  server/      Catalog queries used by the API routes (server-only).
  app/api/     HTTP contract: /api/categories, /api/products?q=&category=, /api/products/:id
  data/        Client-side repositories behind interfaces:
               ProductRepository (fetches /api) and OrderRepository (localStorage mock).
  services/    Use cases that combine domain + data (placeOrder).
  state/       React glue: persisted Zustand cart store, useAsync (loading/error/success +
               retry, stale-response safe), catalog/order query hooks, checkout form hook.
  components/  Presentational pieces: header, product card/grid/rail, status views.
  app/         Pages: /, /search, /product/[id], /cart, /checkout, /orders, /orders/[id]
```

- **Persistence.** The cart is a Zustand store with `persist` to localStorage. Hydration is deferred until after mount, so the server HTML and the first client render match. Pages show "Loading your cart…" rather than a false "empty". Orders are stored through `OrderRepository`, which is async on purpose, so a real API can replace it without touching the pages.
- **Loading, error and empty states.** Every async view goes through `useAsync` and renders a spinner, an error with **Try again**, or an empty state. Other cases handled: product 404, empty search, empty cart, checkout with an empty cart, per-field address validation, a failure to save the order (shown inline, and the cart is **not** cleared), and remote images that fail (a placeholder instead of a broken image).
- **Money** is stored as integer cents everywhere, so there's no float drift in totals.
- **Catalog.** 61 products in 10 categories, snapshotted from dummyjson.com into `src/data/catalog.json`, so the app doesn't depend on a third-party API at runtime. Images still come from its CDN.

## What I cut, and why

| Cut | Why |
|---|---|
| Wishlist, login/register, reviews/Q&A, multi-step checkout, animations | Explicitly out of scope in the brief. |
| Price filter (kept the category filter only) | The brief asks for one filter. Category also drives the home tiles, so one mechanism serves both. |
| Real backend and database for orders | A mock is allowed. Orders sit behind a repository interface in localStorage, which meets "survives restart" with no infrastructure. |
| Payment | Mocked. "Place Order" only needs an address. |
| Pagination and sorting on search | 61 products fit on one page. |
| Tax, shipping and promo codes | Not required. Subtotal equals total. |
| Component and E2E tests in the repo | Unit tests cover the domain rules. The flow was checked with a throwaway headless-Chrome script, not a committed Playwright suite (see below). |
| Visual polish | Lowest weight. Tailwind utilities, no design system. |

## With more time

1. A **committed Playwright suite** for the required flow, including the browser restart, run in CI.
2. **Real persistence for orders**: a server route plus SQLite/Postgres, with idempotent order creation (a client-generated key) so a double-submit can't create two orders.
3. **Stock and price re-check at checkout**: cart lines snapshot price and stock when added, so the server should re-validate them when the order is placed.
4. Self-host product images, or add a blur placeholder, since the CDN occasionally times out.
5. Server-render the catalog pages (they're client-fetched today to keep one data path) for SEO and first paint.
6. Accessibility pass (focus management after navigation, keyboard use of the image gallery), then visual polish.

## Process notes

- Development was done with Claude Code (Opus 5.5). The prompt and response logs are in `.agent-logs/`, and the capture setup is described in `CAPTURE-TEST.md`.
