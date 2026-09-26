import { describe, expect, it } from "vitest";
import { computeDiscount, describeCoupon, normalizeCouponCode, type Coupon } from "./coupon";

const now = new Date("2026-09-27T12:00:00Z");
const coupon = (o: Partial<Coupon> = {}): Coupon => ({
  code: "TEST",
  kind: "percent",
  value: 10,
  minSubtotalCents: 0,
  maxDiscountCents: null,
  startsAt: null,
  expiresAt: null,
  active: true,
  ...o,
});

describe("computeDiscount", () => {
  it("percent: floors to whole cents and respects the cap", () => {
    expect(computeDiscount(coupon({ value: 10 }), 12345, now)).toEqual({ ok: true, discountCents: 1234 });
    expect(computeDiscount(coupon({ value: 50, maxDiscountCents: 2000 }), 100000, now)).toEqual({ ok: true, discountCents: 2000 });
  });

  it("fixed: never exceeds the subtotal", () => {
    expect(computeDiscount(coupon({ kind: "fixed", value: 2000 }), 15000, now)).toEqual({ ok: true, discountCents: 2000 });
    expect(computeDiscount(coupon({ kind: "fixed", value: 2000 }), 500, now)).toEqual({ ok: true, discountCents: 500 });
  });

  it("enforces active, window and minimum subtotal", () => {
    expect(computeDiscount(coupon({ active: false }), 1000, now)).toEqual({ ok: false, reason: "inactive" });
    expect(computeDiscount(coupon({ startsAt: new Date("2026-10-01") }), 1000, now)).toEqual({ ok: false, reason: "not_started" });
    expect(computeDiscount(coupon({ expiresAt: new Date("2026-09-27T12:00:00Z") }), 1000, now)).toEqual({ ok: false, reason: "expired" });
    expect(computeDiscount(coupon({ minSubtotalCents: 10000 }), 9999, now)).toEqual({ ok: false, reason: "below_minimum" });
    expect(computeDiscount(coupon({ minSubtotalCents: 10000 }), 10000, now).ok).toBe(true);
  });
});

describe("coupon helpers", () => {
  it("normalizes codes", () => {
    expect(normalizeCouponCode("  welcome10 ")).toBe("WELCOME10");
  });

  it("describes coupons", () => {
    expect(describeCoupon(coupon({ value: 10, maxDiscountCents: 5000 }))).toBe("10% off (up to $50.00)");
    expect(describeCoupon(coupon({ kind: "fixed", value: 2000, minSubtotalCents: 10000 }))).toBe("$20.00 off on orders over $100.00");
  });
});
