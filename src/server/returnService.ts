import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, withTransaction, type Tx } from "@/db/client";
import { orderItems, orders, returnItems, returns } from "@/db/schema";
import { CheckoutError } from "@/domain/checkout";
import {
  refundFor,
  remainingReturnable,
  returnEligibility,
  returnItemsProblem,
  type ReturnReason,
  type ReturnRequestView,
} from "@/domain/returns";
import { NotFoundError } from "./errors";

type ReturnRow = typeof returns.$inferSelect;

function newReturnId(): string {
  return `RET-${randomBytes(5).toString("hex").toUpperCase()}`;
}

type Executor = Pick<typeof db, "select"> | Pick<Tx, "select">;

const ownedBy = (userId: string, orderId: string) => and(eq(orders.id, orderId), eq(orders.userId, userId));

async function ownedOrder(userId: string, orderId: string) {
  const [order] = await db.select().from(orders).where(ownedBy(userId, orderId)).limit(1);
  if (!order) throw new NotFoundError("Order not found.");
  return order;
}

/** Same, inside a transaction, holding a row lock on the order until commit. */
async function lockOwnedOrder(tx: Tx, userId: string, orderId: string) {
  const [order] = await tx.select().from(orders).where(ownedBy(userId, orderId)).limit(1).for("update");
  if (!order) throw new NotFoundError("Order not found.");
  return order;
}

async function earlierReturns(executor: Executor, orderId: string) {
  const rows = await executor.select({ id: returns.id, status: returns.status }).from(returns).where(eq(returns.orderId, orderId));
  if (rows.length === 0) return [];
  const items = await executor.select().from(returnItems).where(inArray(returnItems.returnId, rows.map((r) => r.id)));
  return rows.map((r) => ({ status: r.status, items: items.filter((i) => i.returnId === r.id) }));
}

export type ReturnOptions = {
  eligible: boolean;
  reason: string | null;
  closesAt: string | null;
  items: { productId: string; title: string; thumbnail: string; purchased: number; remaining: number }[];
};

/** What the user may still return from one of their orders (404 for anyone else's). */
export async function returnOptions(userId: string, orderId: string): Promise<ReturnOptions> {
  const order = await ownedOrder(userId, orderId);
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const remaining = remainingReturnable(lines, await earlierReturns(db, orderId));
  const eligibility = returnEligibility(order, new Date());
  const items = lines.map((l) => ({
    productId: l.productId,
    title: l.title,
    thumbnail: l.thumbnail,
    purchased: l.quantity,
    remaining: remaining.get(l.productId) ?? 0,
  }));
  return {
    eligible: eligibility.ok && items.some((i) => i.remaining > 0),
    reason: eligibility.ok ? (items.some((i) => i.remaining > 0) ? null : "Everything in this order has already been returned.") : eligibility.reason,
    closesAt: eligibility.ok ? eligibility.closesAt.toISOString() : null,
    items,
  };
}

export type CreateReturnInput = {
  items: { productId: string; quantity: number }[];
  reason: ReturnReason;
  comment?: string;
};

/**
 * Creates a return request. Under a lock on the order row, it re-checks eligibility and
 * the quantities still returnable, so concurrent requests can't over-return an item.
 * The refund is computed from what was actually paid; nothing monetary comes from the client.
 */
export async function createReturn(userId: string, orderId: string, input: CreateReturnInput): Promise<ReturnRequestView> {
  const id = await withTransaction(async (tx) => {
    const order = await lockOwnedOrder(tx, userId, orderId);
    const eligibility = returnEligibility(order, new Date());
    if (!eligibility.ok) throw new CheckoutError(eligibility.reason);

    const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const remaining = remainingReturnable(lines, await earlierReturns(tx, orderId));
    const wanted = input.items.filter((i) => i.quantity > 0);
    const problem = returnItemsProblem(wanted, remaining);
    if (problem) throw new CheckoutError(problem);

    const refundCents = refundFor(
      { subtotalCents: order.subtotalCents, totalCents: order.totalCents, lines: lines.map((l) => ({ productId: l.productId, priceCents: l.unitPriceCents })) },
      wanted,
    );
    const returnId = newReturnId();
    await tx.insert(returns).values({
      id: returnId,
      orderId,
      userId,
      reason: input.reason,
      comment: input.comment?.trim() || null,
      refundCents,
    });
    await tx.insert(returnItems).values(wanted.map((i) => ({ returnId, productId: i.productId, quantity: i.quantity })));
    return returnId;
  });
  return getReturn(userId, id);
}

async function toViews(rows: ReturnRow[]): Promise<ReturnRequestView[]> {
  if (rows.length === 0) return [];
  const items = await db.select().from(returnItems).where(inArray(returnItems.returnId, rows.map((r) => r.id)));
  const lines = await db.select().from(orderItems).where(inArray(orderItems.orderId, [...new Set(rows.map((r) => r.orderId))]));
  return rows.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    status: r.status,
    reason: r.reason,
    comment: r.comment,
    refundCents: r.refundCents,
    createdAt: r.createdAt.toISOString(),
    items: items
      .filter((i) => i.returnId === r.id)
      .map((i) => {
        const line = lines.find((l) => l.orderId === r.orderId && l.productId === i.productId);
        return { productId: i.productId, title: line?.title ?? i.productId, thumbnail: line?.thumbnail ?? "", quantity: i.quantity };
      }),
  }));
}

export async function listReturns(userId: string): Promise<ReturnRequestView[]> {
  const rows = await db.select().from(returns).where(eq(returns.userId, userId)).orderBy(desc(returns.createdAt));
  return toViews(rows);
}

/** Someone else's return is indistinguishable from a missing one (404). */
export async function getReturn(userId: string, returnId: string): Promise<ReturnRequestView> {
  const rows = await db
    .select()
    .from(returns)
    .where(and(eq(returns.id, returnId), eq(returns.userId, userId)))
    .limit(1);
  if (rows.length === 0) throw new NotFoundError("Return not found.");
  return (await toViews(rows))[0];
}
