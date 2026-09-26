import { describe, expect, it } from "vitest";
import { cartItemCount, cartSubtotal, clampQuantity, MAX_QUANTITY_PER_LINE, maxQuantityFor } from "./cart";

describe("cart quantity rules", () => {
  it("caps at stock and at the per-line maximum", () => {
    expect(maxQuantityFor({ stock: 3 })).toBe(3);
    expect(maxQuantityFor({ stock: 500 })).toBe(MAX_QUANTITY_PER_LINE);
    expect(maxQuantityFor({ stock: 0 })).toBe(0);
  });

  it("clamps requests to whole numbers within range; 0 means remove", () => {
    expect(clampQuantity(2, { stock: 5 })).toBe(2);
    expect(clampQuantity(99, { stock: 5 })).toBe(5);
    expect(clampQuantity(2.9, { stock: 5 })).toBe(2);
    expect(clampQuantity(-4, { stock: 5 })).toBe(0);
    expect(clampQuantity(Number.NaN, { stock: 5 })).toBe(0);
    expect(clampQuantity(Number.POSITIVE_INFINITY, { stock: 5 })).toBe(0);
    expect(clampQuantity(3, { stock: 0 })).toBe(0);
  });
});

describe("cart totals", () => {
  it("computes subtotal in integer cents and item count", () => {
    const items = [
      { priceCents: 1999, quantity: 3 },
      { priceCents: 10, quantity: 1 },
    ];
    expect(cartSubtotal(items)).toBe(1999 * 3 + 10);
    expect(cartItemCount(items)).toBe(4);
  });
});
