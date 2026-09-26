import "server-only";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db, withTransaction } from "@/db/client";
import { paymentMethods } from "@/db/schema";
import { isExpired, toStoredCard, validateCard, type CardBrand, type CardInput, type PaymentMethod } from "@/domain/payment";
import { BadRequestError, NotFoundError } from "./errors";

type Row = typeof paymentMethods.$inferSelect;

const toMethod = (r: Row): PaymentMethod => ({
  id: r.id,
  brand: r.brand as CardBrand,
  last4: r.last4,
  expMonth: r.expMonth,
  expYear: r.expYear,
  holderName: r.holderName,
  isDefault: r.isDefault,
});

const owned = (userId: string, id: string) => and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId));

export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(desc(paymentMethods.isDefault), asc(paymentMethods.createdAt));
  return rows.map(toMethod);
}

export async function getPaymentMethod(userId: string, id: string): Promise<PaymentMethod> {
  const [row] = await db.select().from(paymentMethods).where(owned(userId, id)).limit(1);
  if (!row) throw new NotFoundError("Payment method not found.");
  return toMethod(row);
}

/**
 * Validates the card (Luhn, expiry) and stores only brand, last 4 and expiry. The full
 * number exists only in this request's memory. A real integration would use a payment
 * provider's tokenizer instead, so the number never touches this server at all.
 */
export async function addPaymentMethod(userId: string, input: CardInput, makeDefault = false): Promise<PaymentMethod> {
  const errors = validateCard(input, new Date());
  const first = Object.values(errors)[0];
  if (first) throw new BadRequestError(first);
  const card = toStoredCard(input);

  return withTransaction(async (tx) => {
    const [existing] = await tx.select({ id: paymentMethods.id }).from(paymentMethods).where(eq(paymentMethods.userId, userId)).limit(1);
    const isDefault = makeDefault || !existing;
    if (isDefault) {
      await tx.update(paymentMethods).set({ isDefault: false }).where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isDefault, true)));
    }
    const [row] = await tx.insert(paymentMethods).values({ ...card, userId, isDefault }).returning();
    return toMethod(row);
  });
}

export async function setDefaultPaymentMethod(userId: string, id: string): Promise<PaymentMethod[]> {
  await withTransaction(async (tx) => {
    const [target] = await tx.select({ id: paymentMethods.id }).from(paymentMethods).where(owned(userId, id)).for("update");
    if (!target) throw new NotFoundError("Payment method not found.");
    await tx.update(paymentMethods).set({ isDefault: false }).where(and(eq(paymentMethods.userId, userId), ne(paymentMethods.id, id)));
    await tx.update(paymentMethods).set({ isDefault: true }).where(owned(userId, id));
  });
  return listPaymentMethods(userId);
}

export async function deletePaymentMethod(userId: string, id: string): Promise<PaymentMethod[]> {
  await withTransaction(async (tx) => {
    const [deleted] = await tx.delete(paymentMethods).where(owned(userId, id)).returning();
    if (!deleted) throw new NotFoundError("Payment method not found.");
    if (deleted.isDefault) {
      const [next] = await tx
        .select({ id: paymentMethods.id })
        .from(paymentMethods)
        .where(eq(paymentMethods.userId, userId))
        .orderBy(desc(paymentMethods.createdAt))
        .limit(1);
      if (next) await tx.update(paymentMethods).set({ isDefault: true }).where(owned(userId, next.id));
    }
  });
  return listPaymentMethods(userId);
}

/** For checkout: the card must be the user's and not expired. */
export async function requireUsablePaymentMethod(userId: string, id: string): Promise<PaymentMethod> {
  const method = await getPaymentMethod(userId, id);
  if (isExpired(method.expMonth, method.expYear, new Date())) throw new BadRequestError("That card has expired. Choose another.");
  return method;
}
