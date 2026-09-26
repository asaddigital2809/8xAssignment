import { describe, expect, it } from "vitest";
import {
  buildOrderDraft,
  canPay,
  CheckoutError,
  EMPTY_ADDRESS,
  isValid,
  stockShortfalls,
  validateAddress,
  type PricedLine,
} from "./checkout";
import type { Address } from "./types";

const address: Address = {
  fullName: " Asad Khan ",
  line1: "1 Main St",
  city: "Lahore",
  postalCode: "54000",
  country: "Pakistan",
};

const line = (overrides: Partial<PricedLine> = {}): PricedLine => ({
  productId: "p1",
  title: "Phone",
  thumbnail: "t.png",
  unitPriceCents: 1000,
  quantity: 2,
  stock: 5,
  ...overrides,
});

describe("validateAddress", () => {
  it("flags every missing address field", () => {
    expect(Object.keys(validateAddress(EMPTY_ADDRESS)).sort()).toEqual(["city", "country", "fullName", "line1", "postalCode"]);
    expect(isValid(validateAddress(address))).toBe(true);
  });
});

describe("buildOrderDraft", () => {
  it("prices from the given (server-side) unit prices and trims the address", () => {
    const draft = buildOrderDraft([line(), line({ productId: "p2", title: "Case", unitPriceCents: 250, quantity: 3 })], address);
    expect(draft.subtotalCents).toBe(2000 + 750);
    expect(draft.discountCents).toBe(0);
    expect(draft.totalCents).toBe(2750);
    expect(draft.address.fullName).toBe("Asad Khan");
    expect(draft.lines[0]).not.toHaveProperty("stock");
  });

  it("applies a discount but never below zero", () => {
    expect(buildOrderDraft([line()], address, 500)).toMatchObject({ subtotalCents: 2000, discountCents: 500, totalCents: 1500 });
    expect(buildOrderDraft([line()], address, 99999)).toMatchObject({ discountCents: 2000, totalCents: 0 });
    expect(buildOrderDraft([line()], address, -50)).toMatchObject({ discountCents: 0, totalCents: 2000 });
  });

  it("refuses an empty cart, an invalid address, or more than is in stock", () => {
    expect(() => buildOrderDraft([], address)).toThrow(CheckoutError);
    expect(() => buildOrderDraft([line()], EMPTY_ADDRESS)).toThrow(CheckoutError);
    expect(() => buildOrderDraft([line({ quantity: 6, stock: 5 })], address)).toThrow(/Not enough stock for: Phone/);
  });
});

describe("stockShortfalls", () => {
  it("lists only lines that exceed stock", () => {
    expect(stockShortfalls([line({ quantity: 5, stock: 5 }), line({ title: "Case", quantity: 2, stock: 1 })])).toEqual(["Case"]);
  });
});

describe("canPay", () => {
  it("allows paying only a pending order", () => {
    expect(canPay("pending_payment")).toBe(true);
    for (const s of ["paid", "shipped", "delivered", "cancelled"] as const) expect(canPay(s)).toBe(false);
  });
});
