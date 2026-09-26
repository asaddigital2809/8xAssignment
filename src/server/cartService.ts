import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { cartItems, products } from "@/db/schema";
import { cartSubtotal, clampQuantity, maxQuantityFor } from "@/domain/cart";
import { CheckoutError } from "@/domain/checkout";
import type { Cart } from "@/domain/types";
import { NotFoundError } from "./errors";

/** The user's cart, priced from the catalog right now. Quantities over stock are kept and flagged via maxQuantity. */
export async function getCart(userId: string): Promise<Cart> {
  const rows = await db
    .select({
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      title: products.title,
      priceCents: products.priceCents,
      thumbnail: products.thumbnail,
      stock: products.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.addedAt));

  const items = rows.map(({ stock, ...r }) => ({ ...r, maxQuantity: maxQuantityFor({ stock }) }));
  return { items, subtotalCents: cartSubtotal(items) };
}

async function findProduct(productId: string) {
  const [product] = await db
    .select({ id: products.id, stock: products.stock })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) throw new NotFoundError("Product not found.");
  return product;
}

/** Adds to (or merges into) the user's line, capped at stock and the per-line max in one atomic upsert. */
export async function addItem(userId: string, productId: string, quantity: number): Promise<Cart> {
  const product = await findProduct(productId);
  const max = maxQuantityFor(product);
  const qty = clampQuantity(quantity, product);
  if (qty === 0) throw new CheckoutError("This item is out of stock.");

  await db
    .insert(cartItems)
    .values({ userId, productId, quantity: qty })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { quantity: sql`least(${cartItems.quantity} + ${qty}, ${max})` },
    });
  return getCart(userId);
}

/** Sets a line's quantity (clamped); 0 removes it. Only ever touches the caller's own line. */
export async function setItemQuantity(userId: string, productId: string, quantity: number): Promise<Cart> {
  const product = await findProduct(productId);
  const qty = clampQuantity(quantity, product);
  if (qty === 0) return removeItem(userId, productId);

  const updated = await db
    .update(cartItems)
    .set({ quantity: qty })
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .returning({ productId: cartItems.productId });
  if (updated.length === 0) throw new NotFoundError("That item isn't in your cart.");
  return getCart(userId);
}

export async function removeItem(userId: string, productId: string): Promise<Cart> {
  await db.delete(cartItems).where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
  return getCart(userId);
}
