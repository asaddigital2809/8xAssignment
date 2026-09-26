import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, orderItems, products } from "@/db/schema";
import {
  slugify,
  validateCategory,
  validateProduct,
  type AdminCategoryRow,
  type AdminProductRow,
  type CategoryInput,
  type ProductInput,
} from "@/domain/admin";
import { escapeLike } from "@/domain/search";
import { BadRequestError, ConflictError, NotFoundError } from "../errors";

// Everything here assumes the caller is an admin (withAdmin / requireAdmin checked the DB role).

type ProductRow = typeof products.$inferSelect;

function toAdminProduct(r: ProductRow): AdminProductRow {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    categoryId: r.categoryId,
    brand: r.brand ?? undefined,
    priceCents: r.priceCents,
    rating: r.rating,
    reviewCount: r.reviewCount,
    stock: r.stock,
    thumbnail: r.thumbnail,
    images: r.images,
    archived: r.archived,
  };
}

function firstError(errors: Record<string, string | undefined>): void {
  const first = Object.values(errors).find(Boolean);
  if (first) throw new BadRequestError(first);
}

async function assertCategory(id: string) {
  const [c] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).limit(1);
  if (!c) throw new BadRequestError("That category doesn't exist.");
}

function productValues(input: ProductInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    categoryId: input.categoryId,
    brand: input.brand.trim() || null,
    priceCents: input.priceCents,
    stock: input.stock,
    images: input.images,
    thumbnail: input.images[0],
  };
}

// ---- products -------------------------------------------------------------------------

export async function listAdminProducts(filter: { q?: string; categoryId?: string }): Promise<AdminProductRow[]> {
  const where: SQL[] = [];
  if (filter.categoryId) where.push(eq(products.categoryId, filter.categoryId));
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where.push(or(ilike(products.title, pattern), ilike(products.id, pattern), ilike(products.brand, pattern))!);
  }
  const rows = await db
    .select()
    .from(products)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(products.archived), asc(products.title))
    .limit(500);
  return rows.map(toAdminProduct);
}

export async function getAdminProduct(id: string): Promise<AdminProductRow> {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) throw new NotFoundError("Product not found.");
  return toAdminProduct(row);
}

export async function createProduct(input: ProductInput): Promise<AdminProductRow> {
  firstError(validateProduct(input));
  await assertCategory(input.categoryId);
  const [row] = await db
    .insert(products)
    .values({ id: `p-${randomBytes(4).toString("hex")}`, rating: 0, ...productValues(input) })
    .returning();
  return toAdminProduct(row);
}

export async function updateProduct(id: string, input: ProductInput): Promise<AdminProductRow> {
  firstError(validateProduct(input));
  await assertCategory(input.categoryId);
  const [row] = await db.update(products).set(productValues(input)).where(eq(products.id, id)).returning();
  if (!row) throw new NotFoundError("Product not found.");
  return toAdminProduct(row);
}

/**
 * Deletes a product that was never ordered. One that appears in any order is archived
 * instead (orders must keep pointing at it): hidden from the store and not purchasable.
 */
export async function deleteProduct(id: string): Promise<{ result: "deleted" | "archived" }> {
  await getAdminProduct(id);
  const [{ n }] = await db.select({ n: count() }).from(orderItems).where(eq(orderItems.productId, id));
  if (n > 0) {
    await db.update(products).set({ archived: true }).where(eq(products.id, id));
    return { result: "archived" };
  }
  await db.delete(products).where(eq(products.id, id));
  return { result: "deleted" };
}

export async function setProductArchived(id: string, archived: boolean): Promise<AdminProductRow> {
  const [row] = await db.update(products).set({ archived }).where(eq(products.id, id)).returning();
  if (!row) throw new NotFoundError("Product not found.");
  return toAdminProduct(row);
}

// ---- categories ---------------------------------------------------------------------------

export async function listAdminCategories(): Promise<AdminCategoryRow[]> {
  const rows = await db
    .select({ id: categories.id, name: categories.name, image: categories.image, productCount: count(products.id) })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  return rows;
}

/** The id is a slug of the name, fixed at creation (it appears in URLs and product rows). */
export async function createCategory(input: CategoryInput): Promise<AdminCategoryRow> {
  firstError(validateCategory(input));
  const id = slugify(input.name);
  const inserted = await db
    .insert(categories)
    .values({ id, name: input.name.trim(), image: input.image })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) throw new ConflictError("A category with that name already exists.");
  return { ...inserted[0], productCount: 0 };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<AdminCategoryRow> {
  firstError(validateCategory(input));
  const [row] = await db.update(categories).set({ name: input.name.trim(), image: input.image }).where(eq(categories.id, id)).returning();
  if (!row) throw new NotFoundError("Category not found.");
  const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.categoryId, id));
  return { ...row, productCount: n };
}

export async function deleteCategory(id: string): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.categoryId, id));
  if (n > 0) throw new ConflictError(`This category still has ${n} product${n === 1 ? "" : "s"}. Move or delete them first.`);
  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
  if (deleted.length === 0) throw new NotFoundError("Category not found.");
}
