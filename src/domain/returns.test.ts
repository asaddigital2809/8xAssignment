import { describe, expect, it } from "vitest";
import { refundFor, remainingReturnable, returnEligibility, returnItemsProblem, RETURN_WINDOW_DAYS } from "./returns";

const now = new Date("2026-09-27T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

describe("returnEligibility", () => {
  it("requires a delivered order", () => {
    expect(returnEligibility({ status: "paid", deliveredAt: null }, now).ok).toBe(false);
    expect(returnEligibility({ status: "shipped", deliveredAt: null }, now).ok).toBe(false);
    expect(returnEligibility({ status: "delivered", deliveredAt: daysAgo(3) }, now).ok).toBe(true);
  });

  it("closes the window after RETURN_WINDOW_DAYS", () => {
    expect(returnEligibility({ status: "delivered", deliveredAt: daysAgo(RETURN_WINDOW_DAYS - 1) }, now).ok).toBe(true);
    expect(returnEligibility({ status: "delivered", deliveredAt: daysAgo(RETURN_WINDOW_DAYS) }, now)).toMatchObject({ ok: false });
  });
});

describe("remainingReturnable / returnItemsProblem", () => {
  const purchased = [
    { productId: "a", quantity: 3 },
    { productId: "b", quantity: 1 },
  ];

  it("subtracts earlier requests except rejected ones", () => {
    const left = remainingReturnable(purchased, [
      { status: "requested", items: [{ productId: "a", quantity: 1 }] },
      { status: "rejected", items: [{ productId: "a", quantity: 2 }] },
      { status: "refunded", items: [{ productId: "b", quantity: 1 }] },
    ]);
    expect(left.get("a")).toBe(2);
    expect(left.get("b")).toBe(0);
  });

  it("rejects over-returns, unknown items, duplicates and empty requests", () => {
    const left = new Map([
      ["a", 2],
      ["b", 0],
    ]);
    expect(returnItemsProblem([{ productId: "a", quantity: 2 }], left)).toBeNull();
    expect(returnItemsProblem([{ productId: "a", quantity: 3 }], left)).toMatch(/at most 2/);
    expect(returnItemsProblem([{ productId: "b", quantity: 1 }], left)).toMatch(/already been returned/);
    expect(returnItemsProblem([{ productId: "zzz", quantity: 1 }], left)).toMatch(/isn't part of this order/);
    expect(returnItemsProblem([{ productId: "a", quantity: 1 }, { productId: "a", quantity: 1 }], left)).toMatch(/only be listed once/);
    expect(returnItemsProblem([{ productId: "a", quantity: 0 }], left)).toMatch(/at least one/);
    expect(returnItemsProblem([{ productId: "a", quantity: 1.5 }], left)).toMatch(/whole numbers/);
  });
});

describe("refundFor", () => {
  const order = {
    subtotalCents: 10000,
    totalCents: 9000, // 10% coupon
    lines: [
      { productId: "a", priceCents: 3000 },
      { productId: "b", priceCents: 4000 },
    ],
  };

  it("refunds what was actually paid (discount shared pro rata)", () => {
    expect(refundFor(order, [{ productId: "a", quantity: 1 }])).toBe(2700);
    expect(refundFor({ ...order, totalCents: 10000 }, [{ productId: "a", quantity: 1 }])).toBe(3000);
  });

  it("never lets an order's refunds exceed its total", () => {
    const all = refundFor(order, [
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 1 },
    ]);
    expect(all).toBeLessThanOrEqual(order.totalCents);
    expect(refundFor({ subtotalCents: 3, totalCents: 2, lines: [{ productId: "a", priceCents: 1 }] }, [{ productId: "a", quantity: 3 }])).toBe(2);
  });
});
