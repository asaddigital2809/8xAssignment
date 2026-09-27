/**
 * Demo seed. Safe to re-run: every run ends in the same demo state.
 *
 *   npm run db:seed
 *
 * The database is shared with the deployment, so this is targeted, not a wipe:
 *  - removes test fixtures (users @example.com, and products/categories/coupons that
 *    aren't part of the demo set) plus all activity of the demo accounts;
 *  - leaves every other real account alone;
 *  - rebuilds the catalog, demo users, coupons and a demo story (orders in every state,
 *    returns, reviews with/without Verified Purchase, helpful votes, a wish list).
 * Everything after the catalog runs in one transaction.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { eq, inArray, like, notInArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import catalog from "../src/data/catalog.json";
import * as schema from "../src/db/schema";
import { buildOrderDraft } from "../src/domain/checkout";
import { computeDiscount } from "../src/domain/coupon";
import { refundFor, type ReturnReason, type ReturnStatus } from "../src/domain/returns";
import type { Address, OrderStatus } from "../src/domain/types";
// server/* modules import "server-only"; the npm script runs tsx with
// --conditions=react-server so that import resolves to its no-op build.
import { hashPassword } from "../src/server/password";

const {
  addresses,
  cartItems,
  categories,
  couponRedemptions,
  coupons,
  orderItems,
  orders,
  paymentMethods,
  products,
  returnItems,
  returns,
  reviewVotes,
  reviews,
  uploads,
  users,
  wishlistItems,
} = schema;

// ---------------------------------------------------------------------------
// Demo definitions
// ---------------------------------------------------------------------------

const DEMO_USERS = [
  { key: "admin", name: "Admin User", email: "admin@amzn.clone", password: "Admin12345", role: "admin" },
  { key: "sam", name: "Sam Shopper", email: "shopper@amzn.clone", password: "Shopper12345", role: "user" },
  { key: "riley", name: "Riley Buyer", email: "riley@amzn.clone", password: "Riley12345", role: "user" },
  { key: "jordan", name: "Jordan Browser", email: "jordan@amzn.clone", password: "Jordan12345", role: "user" },
] as const;
type UserKey = (typeof DEMO_USERS)[number]["key"];

const DAY = 24 * 60 * 60 * 1000;
const DEMO_COUPONS: (typeof coupons.$inferInsert)[] = [
  // 10% off, capped at $50, once per customer (kept unused for Sam: use it in the demo).
  { code: "WELCOME10", kind: "percent", value: 10, maxDiscountCents: 5000, oncePerUser: true, active: true },
  // $20 off orders of $100+.
  { code: "SAVE20", kind: "fixed", value: 2000, minSubtotalCents: 10000, active: true },
  // Already expired, to show the rejection message.
  { code: "EXPIRED5", kind: "fixed", value: 500, expiresAt: new Date(Date.now() - 365 * DAY), active: true },
];

const ADDRESS: Record<Exclude<UserKey, "admin">, Address> = {
  sam: { fullName: "Sam Shopper", line1: "12 Mall Road", city: "Lahore", postalCode: "54000", country: "Pakistan" },
  riley: { fullName: "Riley Buyer", line1: "8 Clifton Block 5", city: "Karachi", postalCode: "75600", country: "Pakistan" },
  jordan: { fullName: "Jordan Browser", line1: "3 Blue Area", city: "Islamabad", postalCode: "44000", country: "Pakistan" },
};

type DemoOrder = {
  key: string;
  user: UserKey;
  lines: [productId: string, qty: number][];
  status: OrderStatus;
  daysAgo: number;
  coupon?: string;
  returnRequest?: { status: ReturnStatus; reason: ReturnReason; comment: string; items: [string, number][] };
};

// Sam's orders cover every state. The newest delivered one has no return yet, so a
// return can be requested live in the demo; the paid one is there for the admin to ship.
const DEMO_ORDERS: DemoOrder[] = [
  { key: "sam-delivered-fresh", user: "sam", lines: [["p123", 1], ["p100", 1]], status: "delivered", daysAgo: 4 },
  {
    key: "sam-delivered-returned",
    user: "sam",
    lines: [["p106", 1], ["p104", 2]],
    status: "delivered",
    daysAgo: 15,
    coupon: "SAVE20",
    returnRequest: { status: "approved", reason: "damaged", comment: "Charger cable arrived frayed.", items: [["p104", 1]] },
  },
  { key: "sam-paid", user: "sam", lines: [["p159", 1]], status: "paid", daysAgo: 1 },
  { key: "sam-shipped", user: "sam", lines: [["p143", 1], ["p142", 3]], status: "shipped", daysAgo: 3 },
  { key: "sam-cancelled", user: "sam", lines: [["p6", 1]], status: "cancelled", daysAgo: 20 },
  {
    key: "riley-delivered",
    user: "riley",
    lines: [["p123", 1], ["p99", 1]],
    status: "delivered",
    daysAgo: 9,
    returnRequest: { status: "requested", reason: "no_longer_needed", comment: "Bought a second speaker by mistake.", items: [["p99", 1]] },
  },
];

type DemoReview = { user: UserKey; productId: string; rating: number; title: string; body: string; daysAgo: number; helpfulFrom?: UserKey[] };

const DEMO_REVIEWS: DemoReview[] = [
  // Verified: Sam and Riley both bought p123.
  {
    user: "sam",
    productId: "p123",
    rating: 5,
    title: "Best camera I've owned",
    body: "Night mode is genuinely impressive and the battery easily lasts a full day. The 120Hz screen makes older phones feel sluggish.",
    daysAgo: 2,
    helpfulFrom: ["riley", "jordan"],
  },
  {
    user: "riley",
    productId: "p123",
    rating: 4,
    title: "Great phone, pricey",
    body: "Fast, great display and cameras. Knocked a star off for the price and because the charger isn't in the box.",
    daysAgo: 6,
    helpfulFrom: ["sam"],
  },
  // Not verified: Jordan has no orders.
  {
    user: "jordan",
    productId: "p123",
    rating: 3,
    title: "Tried it in a store",
    body: "Handled one at a shop for a while. Feels premium but honestly not a huge jump from my current phone.",
    daysAgo: 1,
  },
  { user: "sam", productId: "p100", rating: 4, title: "Easy pairing", body: "Pairs instantly with my phone and the case fits in any pocket. Sound is good, not audiophile.", daysAgo: 3 },
  {
    user: "sam",
    productId: "p106",
    rating: 5,
    title: "Wear it every day",
    body: "Fitness tracking is accurate and notifications are handy. Gold finish looks better in person.",
    daysAgo: 12,
    helpfulFrom: ["riley"],
  },
  { user: "riley", productId: "p99", rating: 4, title: "Solid speaker", body: "Surprisingly full sound for the size and the built-in hub was easy to set up.", daysAgo: 8 },
  { user: "jordan", productId: "p99", rating: 2, title: "Didn't suit me", body: "Friend lent me theirs for a week. Voice recognition struggled with my accent.", daysAgo: 5 },
];

const SAM_WISHLIST = ["p78", "p101", "p95"];

// ---------------------------------------------------------------------------

const catalogIds = catalog.products.map((p) => p.id);
const catalogById = new Map(catalog.products.map((p) => [p.id, p]));
const demoEmails: string[] = DEMO_USERS.map((u) => u.email);
const demoCodes = DEMO_COUPONS.map((c) => c.code);
const id = (prefix: string, bytes: number) => `${prefix}-${randomBytes(bytes).toString("hex").toUpperCase()}`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (.env.local).");
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  // Password hashing is slow (scrypt), so do it before opening the transaction.
  const hashes = new Map(await Promise.all(DEMO_USERS.map(async (u) => [u.email, await hashPassword(u.password)] as const)));

  await db.transaction(async (tx) => {
    // ---- 1. clear test fixtures and demo activity ------------------------------------------
    const targets = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(or(like(users.email, "%@example.com"), inArray(users.email, demoEmails)));
    const targetIds = targets.map((u) => u.id);
    const testUserIds = targets.filter((u) => !demoEmails.includes(u.email)).map((u) => u.id);

    if (targetIds.length) {
      await tx.delete(orders).where(inArray(orders.userId, targetIds)); // cascades items, returns, redemptions
      await tx.delete(reviewVotes).where(inArray(reviewVotes.userId, targetIds));
      await tx.delete(reviews).where(inArray(reviews.userId, targetIds)); // cascades photos links, votes
      await tx.delete(uploads).where(inArray(uploads.ownerId, targetIds));
      await tx.delete(cartItems).where(inArray(cartItems.userId, targetIds));
      await tx.delete(wishlistItems).where(inArray(wishlistItems.userId, targetIds));
      await tx.delete(addresses).where(inArray(addresses.userId, targetIds));
      await tx.delete(paymentMethods).where(inArray(paymentMethods.userId, targetIds));
    }
    if (testUserIds.length) await tx.delete(users).where(inArray(users.id, testUserIds));

    // Products made in the admin UI / tests: delete unless a real customer's order still
    // references them (then archive).
    const extras = await tx.select({ id: products.id }).from(products).where(notInArray(products.id, catalogIds));
    for (const { id: pid } of extras) {
      const [ref] = await tx.select({ n: sql<number>`count(*)::int` }).from(orderItems).where(eq(orderItems.productId, pid));
      if (ref.n > 0) await tx.update(products).set({ archived: true }).where(eq(products.id, pid));
      else await tx.delete(products).where(eq(products.id, pid));
    }
    const catalogCategoryIds = catalog.categories.map((c) => c.id);
    const extraCats = await tx.select({ id: categories.id }).from(categories).where(notInArray(categories.id, catalogCategoryIds));
    for (const { id: cid } of extraCats) {
      const [ref] = await tx.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.categoryId, cid));
      if (ref.n === 0) await tx.delete(categories).where(eq(categories.id, cid));
    }
    const extraCoupons = await tx.select({ id: coupons.id }).from(coupons).where(notInArray(coupons.code, demoCodes));
    for (const { id: cid } of extraCoupons) {
      const [ref] = await tx.select({ n: sql<number>`count(*)::int` }).from(couponRedemptions).where(eq(couponRedemptions.couponId, cid));
      if (ref.n > 0) await tx.update(coupons).set({ active: false }).where(eq(coupons.id, cid));
      else await tx.delete(coupons).where(eq(coupons.id, cid));
    }

    // ---- 2. catalog ------------------------------------------------------------------------
    await tx
      .insert(categories)
      .values(catalog.categories)
      .onConflictDoUpdate({ target: categories.id, set: { name: sql`excluded.name`, image: sql`excluded.image` } });
    await tx
      .insert(products)
      // Ratings come only from customer reviews (recomputed in step 6), never from the source catalog.
      .values(catalog.products.map((p) => ({ ...p, brand: "brand" in p ? p.brand : null, rating: 0 })))
      .onConflictDoUpdate({
        target: products.id,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          categoryId: sql`excluded.category_id`,
          brand: sql`excluded.brand`,
          priceCents: sql`excluded.price_cents`,
          rating: 0,
          stock: sql`excluded.stock`,
          thumbnail: sql`excluded.thumbnail`,
          images: sql`excluded.images`,
          reviewCount: 0,
          archived: false,
        },
      });

    // ---- 3. users, coupons, addresses, cards -------------------------------------------------
    const userId = {} as Record<UserKey, string>;
    for (const u of DEMO_USERS) {
      const values = { name: u.name, email: u.email, role: u.role, passwordHash: hashes.get(u.email)!, emailVerified: new Date(), passwordChangedAt: null };
      const [row] = await tx.insert(users).values(values).onConflictDoUpdate({ target: users.email, set: values }).returning({ id: users.id });
      userId[u.key] = row.id;
    }

    const couponId = new Map<string, string>();
    for (const c of DEMO_COUPONS) {
      const [row] = await tx
        .insert(coupons)
        .values(c)
        .onConflictDoUpdate({ target: coupons.code, set: { ...c, timesUsed: 0 } })
        .returning({ id: coupons.id });
      couponId.set(c.code, row.id);
    }

    for (const key of ["sam", "riley", "jordan"] as const) {
      await tx.insert(addresses).values({ userId: userId[key], ...ADDRESS[key], isDefault: true });
      await tx.insert(paymentMethods).values({
        userId: userId[key],
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: new Date().getFullYear() + 3,
        holderName: ADDRESS[key].fullName,
        isDefault: true,
      });
    }
    await tx.insert(paymentMethods).values({
      userId: userId.sam,
      brand: "mastercard",
      last4: "4444",
      expMonth: 6,
      expYear: new Date().getFullYear() + 2,
      holderName: "Sam Shopper",
      isDefault: false,
    });

    // ---- 4. orders (priced with the app's own domain rules) ------------------------------------
    for (const o of DEMO_ORDERS) {
      const priced = o.lines.map(([pid, quantity]) => {
        const p = catalogById.get(pid);
        if (!p) throw new Error(`Demo order uses unknown product ${pid}`);
        return { productId: p.id, title: p.title, thumbnail: p.thumbnail, unitPriceCents: p.priceCents, quantity, stock: Number.MAX_SAFE_INTEGER };
      });
      const subtotal = priced.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
      const couponRow = o.coupon ? DEMO_COUPONS.find((c) => c.code === o.coupon)! : undefined;
      let discount = 0;
      if (couponRow) {
        const d = computeDiscount(
          {
            code: couponRow.code,
            kind: couponRow.kind,
            value: couponRow.value,
            minSubtotalCents: couponRow.minSubtotalCents ?? 0,
            maxDiscountCents: couponRow.maxDiscountCents ?? null,
            startsAt: couponRow.startsAt ?? null,
            expiresAt: couponRow.expiresAt ?? null,
            active: true,
          },
          subtotal,
          new Date(),
        );
        if (!d.ok) throw new Error(`Demo coupon ${o.coupon} doesn't apply to ${o.key}: ${d.reason}`);
        discount = d.discountCents;
      }
      const draft = buildOrderDraft(priced, ADDRESS[o.user as Exclude<UserKey, "admin">], discount);

      const placedAt = new Date(Date.now() - o.daysAgo * DAY);
      const paid = o.status !== "pending_payment"; // the demo cancelled order was paid, then cancelled
      const orderId = id("ORD", 6);
      await tx.insert(orders).values({
        id: orderId,
        userId: userId[o.user],
        status: o.status,
        subtotalCents: draft.subtotalCents,
        discountCents: draft.discountCents,
        totalCents: draft.totalCents,
        couponCode: o.coupon ?? null,
        paymentBrand: "visa",
        paymentLast4: "4242",
        shipName: draft.address.fullName,
        shipLine1: draft.address.line1,
        shipCity: draft.address.city,
        shipPostalCode: draft.address.postalCode,
        shipCountry: draft.address.country,
        idempotencyKey: crypto.randomUUID(),
        createdAt: placedAt,
        paidAt: paid ? new Date(placedAt.getTime() + 60_000) : null,
        deliveredAt: o.status === "delivered" ? new Date(placedAt.getTime() + 2 * DAY) : null,
      });
      await tx.insert(orderItems).values(draft.lines.map((l) => ({ orderId, ...l })));
      if (o.coupon) {
        const c = DEMO_COUPONS.find((x) => x.code === o.coupon)!;
        await tx.insert(couponRedemptions).values({ couponId: couponId.get(o.coupon)!, userId: userId[o.user], orderId, oncePerUser: c.oncePerUser ?? false, createdAt: placedAt });
      }

      if (o.returnRequest) {
        const items = o.returnRequest.items.map(([productId, quantity]) => ({ productId, quantity }));
        const refundCents = refundFor(
          { subtotalCents: draft.subtotalCents, totalCents: draft.totalCents, lines: draft.lines.map((l) => ({ productId: l.productId, priceCents: l.unitPriceCents })) },
          items,
        );
        const returnId = id("RET", 5);
        const requestedAt = new Date(placedAt.getTime() + 3 * DAY);
        await tx.insert(returns).values({
          id: returnId,
          orderId,
          userId: userId[o.user],
          status: o.returnRequest.status,
          reason: o.returnRequest.reason,
          comment: o.returnRequest.comment,
          refundCents,
          createdAt: requestedAt,
          updatedAt: requestedAt,
        });
        await tx.insert(returnItems).values(items.map((i) => ({ returnId, ...i })));
      }
    }

    // ---- 5. reviews, helpful votes, wish list -------------------------------------------------
    for (const r of DEMO_REVIEWS) {
      const at = new Date(Date.now() - r.daysAgo * DAY);
      const [row] = await tx
        .insert(reviews)
        .values({ productId: r.productId, userId: userId[r.user], rating: r.rating, title: r.title, body: r.body, createdAt: at, updatedAt: at })
        .returning({ id: reviews.id });
      for (const voter of r.helpfulFrom ?? []) await tx.insert(reviewVotes).values({ reviewId: row.id, userId: userId[voter] });
    }
    for (const pid of SAM_WISHLIST) await tx.insert(wishlistItems).values({ userId: userId.sam, productId: pid });

    // ---- 6. derived counters ----------------------------------------------------------------------
    await tx.execute(sql`
      UPDATE ${products} p SET rating = s.avg, review_count = s.n
      FROM (SELECT product_id, round(avg(rating)::numeric, 1)::real AS avg, count(*)::int AS n FROM ${reviews} GROUP BY product_id) s
      WHERE p.id = s.product_id`);
    await tx.execute(sql`
      UPDATE ${coupons} c SET times_used = (SELECT count(*)::int FROM ${couponRedemptions} r WHERE r.coupon_id = c.id)`);
  });

  const [counts] = await db
    .select({
      users: sql<number>`(select count(*)::int from ${users})`,
      orders: sql<number>`(select count(*)::int from ${orders})`,
      reviews: sql<number>`(select count(*)::int from ${reviews})`,
    })
    .from(sql`(select 1) as one`);
  console.log(`Seeded ${catalog.categories.length} categories, ${catalog.products.length} products, ${DEMO_COUPONS.length} coupons.`);
  console.log(`Demo: ${DEMO_ORDERS.length} orders, ${DEMO_REVIEWS.length} reviews. Totals in DB now: ${counts.users} users, ${counts.orders} orders, ${counts.reviews} reviews.`);
  console.log(`Logins: ${DEMO_USERS.map((u) => `${u.email} / ${u.password}${u.role === "admin" ? " (admin)" : ""}`).join(", ")}`);
  console.log(`Coupons: ${demoCodes.join(", ")}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

