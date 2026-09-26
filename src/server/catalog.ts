import "server-only";
import { and, asc, desc, eq, gt, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { escapeLike, sanitizeQuery } from "@/domain/search";
import type { Category, Product, ProductQuery } from "@/domain/types";

type ProductRow = typeof products.$inferSelect;

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    brand: row.brand ?? undefined,
    priceCents: row.priceCents,
    rating: row.rating,
    reviewCount: row.reviewCount,
    stock: row.stock,
    thumbnail: row.thumbnail,
    images: row.images,
  };
}

export async function listCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function searchProducts(query: ProductQuery): Promise<Product[]> {
  const { terms, categoryId } = sanitizeQuery(query);
  if (categoryId === null) return []; // malformed filter matches nothing

  const conditions: SQL[] = [];
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  for (const term of terms) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(
        ilike(products.title, pattern),
        ilike(products.brand, pattern),
        ilike(products.description, pattern),
        ilike(categories.name, pattern),
      )!,
    );
  }

  const rows = await db
    .select({ product: products })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(products.title));
  return rows.map((r) => toProduct(r.product));
}

/** Top-rated in-stock products, used for the home page rail. */
export async function listFeatured(limit = 12): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(gt(products.stock, 0))
    .orderBy(desc(products.rating), asc(products.id))
    .limit(limit);
  return rows.map(toProduct);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return row ? toProduct(row) : undefined;
}
