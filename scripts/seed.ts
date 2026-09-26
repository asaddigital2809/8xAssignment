/**
 * Idempotent seed: safe to run repeatedly. Upserts the catalog snapshot in
 * src/data/catalog.json and the demo users. Later steps add orders, coupons, reviews.
 *
 *   npm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import catalog from "../src/data/catalog.json";
import * as schema from "../src/db/schema";
// server/* modules import "server-only"; the npm script runs tsx with
// --conditions=react-server so that import resolves to its no-op build.
import { hashPassword } from "../src/server/password";

const DEMO_USERS = [
  { name: "Admin User", email: "admin@amzn.clone", password: "Admin12345", role: "admin" },
  { name: "Sam Shopper", email: "shopper@amzn.clone", password: "Shopper12345", role: "user" },
  { name: "Riley Buyer", email: "riley@amzn.clone", password: "Riley12345", role: "user" },
] as const;

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const DEMO_COUPONS: (typeof schema.coupons.$inferInsert)[] = [
  // 10% off, capped at $50, once per customer.
  { code: "WELCOME10", kind: "percent", value: 10, maxDiscountCents: 5000, oncePerUser: true, active: true },
  // $20 off orders of $100+.
  { code: "SAVE20", kind: "fixed", value: 2000, minSubtotalCents: 10000, active: true },
  // Already expired, to demo the rejection message.
  { code: "EXPIRED5", kind: "fixed", value: 500, expiresAt: new Date(Date.now() - YEAR_MS), active: true },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (.env.local).");
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  await db
    .insert(schema.categories)
    .values(catalog.categories)
    .onConflictDoUpdate({
      target: schema.categories.id,
      set: { name: sql`excluded.name`, image: sql`excluded.image` },
    });

  await db
    .insert(schema.products)
    .values(catalog.products.map((p) => ({ ...p, brand: "brand" in p ? p.brand : null })))
    .onConflictDoUpdate({
      target: schema.products.id,
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        categoryId: sql`excluded.category_id`,
        brand: sql`excluded.brand`,
        priceCents: sql`excluded.price_cents`,
        rating: sql`excluded.rating`,
        stock: sql`excluded.stock`,
        thumbnail: sql`excluded.thumbnail`,
        images: sql`excluded.images`,
      },
    });

  // Demo accounts (documented in the README). Re-running the seed resets them.
  for (const u of DEMO_USERS) {
    const values = {
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: await hashPassword(u.password),
      emailVerified: new Date(),
      passwordChangedAt: null,
    };
    await db
      .insert(schema.users)
      .values(values)
      .onConflictDoUpdate({ target: schema.users.email, set: values });
  }

  // Coupons: definitions are upserted; usage counters are left alone (they must match redemptions).
  for (const c of DEMO_COUPONS) {
    await db.insert(schema.coupons).values(c).onConflictDoUpdate({ target: schema.coupons.code, set: c });
  }

  // A saved address and card for the demo shoppers, only if they have none yet.
  for (const email of ["shopper@amzn.clone", "riley@amzn.clone"]) {
    const [user] = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(eq(schema.users.email, email));
    const [hasAddress] = await db.select({ id: schema.addresses.id }).from(schema.addresses).where(eq(schema.addresses.userId, user.id)).limit(1);
    if (!hasAddress) {
      await db.insert(schema.addresses).values({
        userId: user.id,
        fullName: user.name ?? "Demo Shopper",
        line1: "12 Mall Road",
        city: "Lahore",
        postalCode: "54000",
        country: "Pakistan",
        isDefault: true,
      });
    }
    const [hasCard] = await db.select({ id: schema.paymentMethods.id }).from(schema.paymentMethods).where(eq(schema.paymentMethods.userId, user.id)).limit(1);
    if (!hasCard) {
      await db.insert(schema.paymentMethods).values({
        userId: user.id,
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: new Date().getFullYear() + 3,
        holderName: user.name ?? "Demo Shopper",
        isDefault: true,
      });
    }
  }

  console.log(`Seeded ${catalog.categories.length} categories, ${catalog.products.length} products, ${DEMO_COUPONS.length} coupons.`);
  console.log(`Demo users: ${DEMO_USERS.map((u) => `${u.email} / ${u.password} (${u.role})`).join(", ")}`);
  console.log(`Coupons: ${DEMO_COUPONS.map((c) => c.code).join(", ")}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
