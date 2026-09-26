import { describe, expect, it } from "vitest";
import { buildOrder, CheckoutError, EMPTY_ADDRESS, isValid, validateAddress } from "./checkout";
import type { Address, CartItem } from "./types";

const address: Address = {
  fullName: " Asad Khan ",
  line1: "1 Main St",
  city: "Lahore",
  postalCode: "54000",
  country: "Pakistan",
};

const items: CartItem[] = [
  { productId: "p1", title: "Phone", priceCents: 1000, thumbnail: "t.png", maxQuantity: 10, quantity: 2 },
];

describe("checkout", () => {
  it("flags every missing address field", () => {
    expect(Object.keys(validateAddress(EMPTY_ADDRESS)).sort()).toEqual(["city", "country", "fullName", "line1", "postalCode"]);
    expect(isValid(validateAddress(address))).toBe(true);
  });

  it("builds an order snapshot with a trimmed address and subtotal", () => {
    const order = buildOrder(items, address, new Date("2026-09-26T00:00:00Z"), "ORD-1");
    expect(order.subtotalCents).toBe(2000);
    expect(order.address.fullName).toBe("Asad Khan");
    expect(order.lines).toEqual([{ productId: "p1", title: "Phone", priceCents: 1000, thumbnail: "t.png", quantity: 2 }]);
  });

  it("refuses an empty cart or invalid address", () => {
    expect(() => buildOrder([], address, new Date(), "x")).toThrow(CheckoutError);
    expect(() => buildOrder(items, EMPTY_ADDRESS, new Date(), "x")).toThrow(CheckoutError);
  });
});
