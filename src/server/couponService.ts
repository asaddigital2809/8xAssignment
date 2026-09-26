import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/db/client";
import { couponRedemptions, coupons } from "@/db/schema";
import { CheckoutError } from "@/domain/checkout";
import {
  computeDiscount,
  COUPON_CODE_PATTERN,
  couponRejectionMessage,
  describeCoupon,
  normalizeCouponCode,
  type CouponRejection,
} from "@/domain/coupon";
import type { CheckoutQuote } from "@/domain/types";
import { getCart } from "./cartService";

type CouponRow = typeof coupons.$inferSelect;
type Executor = Pick<typeof db, "select"> | Pick<Tx, "select">;

export type CouponReservation = { couponId: string; code: string; discountCents: number; oncePerUser: boolean };

async function findCoupon(executor: Executor, code: string, lock: boolean): Promise<CouponRow | undefined> {
  const query = executor.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  const [row] = lock ? await query.for("update") : await query;
  return row;
}

async function alreadyUsedBy(executor: Executor, couponId: string, userId: string): Promise<boolean> {
  const [row] = await executor
    .select({ couponId: couponRedemptions.couponId })
    .from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, couponId), eq(couponRedemptions.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/** All coupon rules: the pure ones (dates, minimum) and the usage ones (limits, once per user). */
async function evaluate(
  executor: Executor,
  row: CouponRow | undefined,
  userId: string,
  subtotalCents: number,
): Promise<{ ok: true; discountCents: number } | { ok: false; reason: CouponRejection }> {
  if (!row) return { ok: false, reason: "unknown" };
  const result = computeDiscount(row, subtotalCents, new Date());
  if (!result.ok) return result;
  if (row.usageLimit !== null && row.timesUsed >= row.usageLimit) return { ok: false, reason: "used_up" };
  if (row.oncePerUser && (await alreadyUsedBy(executor, row.id, userId))) return { ok: false, reason: "already_used" };
  return result;
}

function parseCode(raw: string): string | null {
  const code = normalizeCouponCode(raw);
  return COUPON_CODE_PATTERN.test(code) ? code : null;
}

/** Read-only price breakdown for the review step (no locks, nothing reserved). */
export async function quote(userId: string, rawCode?: string): Promise<CheckoutQuote> {
  const { subtotalCents } = await getCart(userId);
  const base: CheckoutQuote = { subtotalCents, discountCents: 0, totalCents: subtotalCents, coupon: null, couponError: null };
  if (!rawCode?.trim()) return base;

  const code = parseCode(rawCode);
  const row = code ? await findCoupon(db, code, false) : undefined;
  const result = await evaluate(db, row, userId, subtotalCents);
  if (!result.ok) return { ...base, couponError: couponRejectionMessage(result.reason, row) };
  return {
    subtotalCents,
    discountCents: result.discountCents,
    totalCents: subtotalCents - result.discountCents,
    coupon: { code: row!.code, description: describeCoupon(row!) },
    couponError: null,
  };
}

/**
 * Inside the order transaction: locks the coupon row and re-validates everything, so
 * concurrent checkouts can't exceed a usage limit or reuse a once-per-user coupon.
 * Throws CheckoutError if it no longer applies (the user sees why; nothing is charged).
 */
export async function reserveCoupon(tx: Tx, userId: string, rawCode: string, subtotalCents: number): Promise<CouponReservation> {
  const code = parseCode(rawCode);
  const row = code ? await findCoupon(tx, code, true) : undefined;
  const result = await evaluate(tx, row, userId, subtotalCents);
  if (!result.ok) throw new CheckoutError(couponRejectionMessage(result.reason, row));
  return { couponId: row!.id, code: row!.code, discountCents: result.discountCents, oncePerUser: row!.oncePerUser };
}

export async function recordRedemption(tx: Tx, r: CouponReservation, userId: string, orderId: string): Promise<void> {
  await tx.insert(couponRedemptions).values({ couponId: r.couponId, userId, orderId, oncePerUser: r.oncePerUser });
  await tx
    .update(coupons)
    .set({ timesUsed: sql`${coupons.timesUsed} + 1` })
    .where(eq(coupons.id, r.couponId));
}
