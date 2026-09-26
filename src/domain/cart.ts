import type { CartItem, Product } from "./types";

/** Per-line cap regardless of stock, to keep the mock sane. */
export const MAX_QUANTITY_PER_LINE = 10;

export function maxQuantityFor(product: Pick<Product, "stock">): number {
  return Math.max(0, Math.min(product.stock, MAX_QUANTITY_PER_LINE));
}

export function addToCart(items: CartItem[], product: Product, quantity = 1): CartItem[] {
  const max = maxQuantityFor(product);
  if (max === 0 || quantity <= 0) return items;

  const existing = items.find((i) => i.productId === product.id);
  if (existing) {
    return setQuantity(items, product.id, existing.quantity + quantity);
  }
  return [
    ...items,
    {
      productId: product.id,
      title: product.title,
      priceCents: product.priceCents,
      thumbnail: product.thumbnail,
      maxQuantity: max,
      quantity: Math.min(quantity, max),
    },
  ];
}

/** Setting a quantity of 0 or less removes the line. */
export function setQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeFromCart(items, productId);
  return items.map((i) =>
    i.productId === productId ? { ...i, quantity: Math.min(Math.floor(quantity), i.maxQuantity) } : i,
  );
}

export function removeFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.productId !== productId);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
