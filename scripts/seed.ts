/**
 * Idempotent seed: safe to run repeatedly. Upserts the catalog snapshot in
 * src/data/catalog.json and the demo users. Later steps add orders, coupons, reviews.
 *
 *   npm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import catalog from "../src/data/catalog.json";
import * as schema from "../src/db/schema";
// server/* modules import "server-only"; the npm script runs tsx with
// --conditions=react-server so that import resolves to its no-op build.
import { hashPassword } from "../src/server/password";

const DEMO_USERS = [
  { name: "Admin User", email: "admin@amzn.clone", password: "Admin12345", role: "admin" },
  { name: "Sam Shopper", email: "shopper@amzn.clone", password: "Shopper12345", role: "user" },
] as const;

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

  console.log(`Seeded ${catalog.categories.length} categories, ${catalog.products.length} products.`);
  console.log(`Demo users: ${DEMO_USERS.map((u) => `${u.email} / ${u.password} (${u.role})`).join(", ")}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
