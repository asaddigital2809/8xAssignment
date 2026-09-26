import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, withTransaction, type Tx } from "@/db/client";
import { cartItems, orderItems, orders, products } from "@/db/schema";
import { buildOrderDraft, canPay, CheckoutError } from "@/domain/checkout";
import type { Address, Order } from "@/domain/types";
import { ConflictError, NotFoundError } from "./errors";

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

function newOrderId(): string {
  return `ORD-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function toOrder(row: OrderRow, items: ItemRow[]): Order {
  return {
    id: row.id,
    status: row.status,
    placedAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    totalCents: row.totalCents,
    address: {
      fullName: row.shipName,
      line1: row.shipLine1,
      city: row.shipCity,
      postalCode: row.shipPostalCode,
      country: row.shipCountry,
    },
    lines: items.map((i) => ({
      productId: i.productId,
      title: i.title,
      thumbnail: i.thumbnail,
      priceCents: i.unitPriceCents,
      quantity: i.quantity,
    })),
  };
}

async function loadItems(orderIds: string[], executor: Pick<typeof db, "select"> = db): Promise<ItemRow[]> {
  if (orderIds.length === 0) return [];
  return executor.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
}

/** Orders are always looked up by (id, owner). Someone else's order is indistinguishable from a missing one. */
export async function getOrder(userId: string, orderId: string): Promise<Order> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!row) throw new NotFoundError("Order not found.");
  return toOrder(row, await loadItems([row.id]));
}

export async function listOrders(userId: string): Promise<Order[]> {
  const rows = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  const items = await loadItems(rows.map((r) => r.id));
  return rows.map((r) => toOrder(r, items.filter((i) => i.orderId === r.id)));
}

async function findByIdempotencyKey(userId: string, key: string): Promise<Order | undefined> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, key)))
    .limit(1);
  return row ? toOrder(row, await loadItems([row.id])) : undefined;
}

/**
 * Creates a pending order from the user's server-side cart. Prices, totals and stock
 * are read from the database inside the transaction; nothing numeric comes from the
 * client. The cart rows are locked so two concurrent checkouts can't both consume them.
 * Repeating the call with the same idempotency key returns the same order.
 */
export async function createOrder(userId: string, address: Address, idempotencyKey: string): Promise<Order> {
  const existing = await findByIdempotencyKey(userId, idempotencyKey);
  if (existing) return existing;

  let orderId: string | null;
  try {
    orderId = await createFromCart(userId, address, idempotencyKey);
  } catch (err) {
    // A concurrent request with the same key may have won the cart lock and emptied the
    // cart, so this one sees "cart is empty". That's a duplicate, not a failure.
    if (err instanceof CheckoutError) {
      const winner = await findByIdempotencyKey(userId, idempotencyKey);
      if (winner) return winner;
    }
    throw err;
  }

  if (orderId === null) {
    const winner = await findByIdempotencyKey(userId, idempotencyKey);
    if (winner) return winner;
    throw new ConflictError("This order is already being placed.");
  }
  return getOrder(userId, orderId);
}

/** The transactional part of createOrder. Returns null if a same-key order was inserted concurrently. */
function createFromCart(userId: string, address: Address, idempotencyKey: string): Promise<string | null> {
  return withTransaction(async (tx) => {
    const lines = await tx
      .select({
        productId: products.id,
        title: products.title,
        thumbnail: products.thumbnail,
        unitPriceCents: products.priceCents,
        stock: products.stock,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .where(eq(cartItems.userId, userId))
      .for("update", { of: cartItems });

    const draft = buildOrderDraft(lines, address);
    const id = newOrderId();
    const inserted = await tx
      .insert(orders)
      .values({
        id,
        userId,
        subtotalCents: draft.subtotalCents,
        discountCents: draft.discountCents,
        totalCents: draft.totalCents,
        shipName: draft.address.fullName,
        shipLine1: draft.address.line1,
        shipCity: draft.address.city,
        shipPostalCode: draft.address.postalCode,
        shipCountry: draft.address.country,
        idempotencyKey,
      })
      .onConflictDoNothing({ target: [orders.userId, orders.idempotencyKey] })
      .returning({ id: orders.id });
    if (inserted.length === 0) return null; // a concurrent request with the same key won

    await tx.insert(orderItems).values(draft.lines.map((l) => ({ orderId: id, ...l })));
    await tx.delete(cartItems).where(eq(cartItems.userId, userId));
    return id;
  });
}

/**
 * Pays a pending order exactly once (mock payment). In one transaction:
 *  1. flip pending_payment -> paid with a conditional UPDATE. A second payment (double
 *     click, replay, concurrent tab) matches zero rows, because the first one's row
 *     lock makes it re-check the status after commit;
 *  2. decrement stock for each line, guarded by `stock >= qty`.
 * If any line is short, everything rolls back: the order stays pending, no stock moves.
 */
export async function payOrder(userId: string, orderId: string): Promise<Order> {
  await withTransaction(async (tx) => {
    const paid = await tx
      .update(orders)
      .set({ status: "paid", paidAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });

    if (paid.length === 0) {
      const [current] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .limit(1);
      if (!current) throw new NotFoundError("Order not found.");
      if (!canPay(current.status)) throw new ConflictError("This order has already been paid.");
      throw new ConflictError("This order can't be paid right now.");
    }

    await decrementStock(tx, await loadItems([orderId], tx));
  });
  return getOrder(userId, orderId);
}

async function decrementStock(tx: Tx, items: ItemRow[]): Promise<void> {
  // Fixed order (by product id) so concurrent payments lock rows in the same order: no deadlocks.
  for (const item of items.toSorted((a, b) => a.productId.localeCompare(b.productId))) {
    const updated = await tx
      .update(products)
      .set({ stock: sql`${products.stock} - ${item.quantity}` })
      .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))
      .returning({ id: products.id });
    if (updated.length === 0) {
      throw new CheckoutError(`Sorry, "${item.title}" sold out before your payment went through. You haven't been charged.`);
    }
  }
}
