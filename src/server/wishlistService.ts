import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, wishlistItems } from "@/db/schema";
import type { Cart, WishlistItem } from "@/domain/types";
import { addItem } from "./cartService";
import { NotFoundError } from "./errors";

export async function listWishlist(userId: string): Promise<WishlistItem[]> {
  const rows = await db
    .select({
      productId: wishlistItems.productId,
      addedAt: wishlistItems.addedAt,
      title: products.title,
      priceCents: products.priceCents,
      thumbnail: products.thumbnail,
      stock: products.stock,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(products.id, wishlistItems.productId))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.addedAt));
  return rows.map(({ stock, addedAt, ...r }) => ({ ...r, inStock: stock > 0, addedAt: addedAt.toISOString() }));
}

/** Idempotent: saving an already-saved product is a no-op. */
export async function addToWishlist(userId: string, productId: string): Promise<WishlistItem[]> {
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new NotFoundError("Product not found.");
  await db.insert(wishlistItems).values({ userId, productId }).onConflictDoNothing();
  return listWishlist(userId);
}

export async function removeFromWishlist(userId: string, productId: string): Promise<WishlistItem[]> {
  await db.delete(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
  return listWishlist(userId);
}

/**
 * Moves one unit to the cart through the normal cart rules (stock, per-line cap), then
 * removes it from the wishlist. If it can't go in the cart (e.g. out of stock), that
 * error is thrown and the item stays saved.
 */
export async function moveToCart(userId: string, productId: string): Promise<{ wishlist: WishlistItem[]; cart: Cart }> {
  const [saved] = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
    .limit(1);
  if (!saved) throw new NotFoundError("That item isn't in your wish list.");
  const cart = await addItem(userId, productId, 1);
  const wishlist = await removeFromWishlist(userId, productId);
  return { wishlist, cart };
}
