export type CouponKind = "percent" | "fixed";

export type Coupon = {
  code: string;
  kind: CouponKind;
  /** percent: 1-100; fixed: cents off. */
  value: number;
  minSubtotalCents: number;
  /** Cap for percent coupons (cents); null = uncapped. */
  maxDiscountCents: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  active: boolean;
};

export type CouponRejection = "inactive" | "not_started" | "expired" | "below_minimum" | "used_up" | "already_used" | "unknown";

export type DiscountResult = { ok: true; discountCents: number } | { ok: false; reason: CouponRejection };

/** Codes are case-insensitive and stored upper-case. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

/**
 * The discount a coupon gives on a subtotal (integer cents), or why it doesn't apply.
 * Never exceeds the subtotal, so a total can't go negative. Usage limits need the
 * database and are checked by the caller.
 */
export function computeDiscount(coupon: Coupon, subtotalCents: number, now: Date): DiscountResult {
  if (!coupon.active) return { ok: false, reason: "inactive" };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: "not_started" };
  if (coupon.expiresAt && now >= coupon.expiresAt) return { ok: false, reason: "expired" };
  if (subtotalCents < coupon.minSubtotalCents) return { ok: false, reason: "below_minimum" };

  let discount =
    coupon.kind === "percent" ? Math.floor((subtotalCents * coupon.value) / 100) : coupon.value;
  if (coupon.kind === "percent" && coupon.maxDiscountCents !== null) discount = Math.min(discount, coupon.maxDiscountCents);
  discount = Math.max(0, Math.min(discount, subtotalCents));
  return { ok: true, discountCents: discount };
}

export function couponRejectionMessage(reason: CouponRejection, coupon?: Pick<Coupon, "minSubtotalCents">): string {
  switch (reason) {
    case "inactive":
    case "unknown":
      return "That coupon code isn't valid.";
    case "not_started":
      return "That coupon isn't active yet.";
    case "expired":
      return "That coupon has expired.";
    case "below_minimum":
      return `This coupon needs a subtotal of at least $${((coupon?.minSubtotalCents ?? 0) / 100).toFixed(2)}.`;
    case "used_up":
      return "That coupon has reached its usage limit.";
    case "already_used":
      return "You've already used this coupon.";
  }
}

export function describeCoupon(c: Pick<Coupon, "kind" | "value" | "maxDiscountCents" | "minSubtotalCents">): string {
  const off = c.kind === "percent" ? `${c.value}% off` : `$${(c.value / 100).toFixed(2)} off`;
  const cap = c.kind === "percent" && c.maxDiscountCents !== null ? ` (up to $${(c.maxDiscountCents / 100).toFixed(2)})` : "";
  const min = c.minSubtotalCents > 0 ? ` on orders over $${(c.minSubtotalCents / 100).toFixed(2)}` : "";
  return off + cap + min;
}
