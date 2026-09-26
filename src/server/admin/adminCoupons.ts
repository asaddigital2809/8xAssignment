import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { coupons } from "@/db/schema";
import { validateCoupon, type AdminCoupon, type CouponInput } from "@/domain/admin";
import { normalizeCouponCode } from "@/domain/coupon";
import { BadRequestError, ConflictError, NotFoundError } from "../errors";

// Everything here assumes the caller is an admin (withAdmin / requireAdmin checked the DB role).

type Row = typeof coupons.$inferSelect;

const toAdmin = (r: Row): AdminCoupon => ({
  id: r.id,
  code: r.code,
  kind: r.kind,
  value: r.value,
  minSubtotalCents: r.minSubtotalCents,
  maxDiscountCents: r.maxDiscountCents,
  startsAt: r.startsAt?.toISOString() ?? null,
  expiresAt: r.expiresAt?.toISOString() ?? null,
  usageLimit: r.usageLimit,
  timesUsed: r.timesUsed,
  oncePerUser: r.oncePerUser,
  active: r.active,
});

function clean(input: CouponInput): CouponInput {
  const c = { ...input, code: normalizeCouponCode(input.code) };
  // A cap only means something for percent coupons.
  if (c.kind === "fixed") c.maxDiscountCents = null;
  const first = Object.values(validateCoupon(c)).find(Boolean);
  if (first) throw new BadRequestError(first);
  return c;
}

export async function listAdminCoupons(): Promise<AdminCoupon[]> {
  return (await db.select().from(coupons).orderBy(asc(coupons.code))).map(toAdmin);
}

export async function createCoupon(input: CouponInput): Promise<AdminCoupon> {
  const values = clean(input);
  const inserted = await db.insert(coupons).values(values).onConflictDoNothing({ target: coupons.code }).returning();
  if (inserted.length === 0) throw new ConflictError("A coupon with that code already exists.");
  return toAdmin(inserted[0]);
}

export async function updateCoupon(id: string, input: CouponInput): Promise<AdminCoupon> {
  const values = clean(input);
  const [current] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!current) throw new NotFoundError("Coupon not found.");
  if (values.usageLimit !== null && values.usageLimit < current.timesUsed) {
    throw new BadRequestError(`It's already been used ${current.timesUsed} times; the limit can't be lower.`);
  }
  try {
    const [row] = await db.update(coupons).set(values).where(eq(coupons.id, id)).returning();
    return toAdmin(row);
  } catch (err) {
    if (err instanceof Error && /coupons_code_unique|duplicate key/.test(`${err.message} ${String(err.cause ?? "")}`)) {
      throw new ConflictError("A coupon with that code already exists.");
    }
    throw err;
  }
}

/** Only never-used coupons can be deleted; used ones are deactivated so order history stays intact. */
export async function deleteCoupon(id: string): Promise<void> {
  const [current] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!current) throw new NotFoundError("Coupon not found.");
  if (current.timesUsed > 0) throw new ConflictError("This coupon has been used, so it can't be deleted. Deactivate it instead.");
  await db.delete(coupons).where(eq(coupons.id, id));
}
