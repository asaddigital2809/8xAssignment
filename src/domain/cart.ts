import type { CartItem, Product } from "./types";

/** Per-line cap regardless of stock, to keep the mock sane. */
export const MAX_QUANTITY_PER_LINE = 10;

export function maxQuantityFor(product: Pick<Product, "stock">): number {
  return Math.max(0, Math.min(product.stock, MAX_QUANTITY_PER_LINE));
}

/**
 * The quantity a cart line may actually hold: whole number, at most the per-line cap
 * and current stock. 0 means "remove the line".
 */
export function clampQuantity(requested: number, product: Pick<Product, "stock">): number {
  if (!Number.isFinite(requested)) return 0;
  return Math.max(0, Math.min(Math.floor(requested), maxQuantityFor(product)));
}

export function cartSubtotal(items: Pick<CartItem, "priceCents" | "quantity">[]): number {
  return items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}

export function cartItemCount(items: Pick<CartItem, "quantity">[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
