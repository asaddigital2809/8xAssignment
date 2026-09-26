import { describe, expect, it } from "vitest";
import { addToCart, cartItemCount, cartSubtotal, MAX_QUANTITY_PER_LINE, removeFromCart, setQuantity } from "./cart";
import type { Product } from "./types";

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  title: "Phone",
  description: "",
  categoryId: "smartphones",
  priceCents: 1999,
  rating: 4.5,
  stock: 50,
  thumbnail: "t.png",
  images: [],
  ...overrides,
});

describe("cart", () => {
  it("adds a new line and merges repeat adds", () => {
    let items = addToCart([], product(), 2);
    items = addToCart(items, product(), 1);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("caps quantity at stock and the per-line max", () => {
    expect(addToCart([], product({ stock: 3 }), 5)[0].quantity).toBe(3);
    expect(addToCart([], product(), 99)[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("ignores out-of-stock products", () => {
    expect(addToCart([], product({ stock: 0 }))).toEqual([]);
  });

  it("removes a line when quantity drops to zero", () => {
    const items = addToCart([], product());
    expect(setQuantity(items, "p1", 0)).toEqual([]);
    expect(removeFromCart(items, "p1")).toEqual([]);
  });

  it("computes subtotal in integer cents", () => {
    const items = addToCart(addToCart([], product(), 3), product({ id: "p2", priceCents: 10 }), 1);
    expect(cartSubtotal(items)).toBe(1999 * 3 + 10);
    expect(cartItemCount(items)).toBe(4);
  });
});
