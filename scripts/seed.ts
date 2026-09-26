/**
 * Idempotent seed: safe to run repeatedly. Upserts the catalog snapshot in
 * src/data/catalog.json. Later steps extend this with users, orders, etc.
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

  console.log(`Seeded ${catalog.categories.length} categories, ${catalog.products.length} products.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
