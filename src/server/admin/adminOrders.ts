import "server-only";
import { and, count, desc, eq, ilike, inArray, or, sql, sum, type SQL } from "drizzle-orm";
import { db, withTransaction } from "@/db/client";
import { couponRedemptions, coupons, orderItems, orders, products, returns, users } from "@/db/schema";
import { canTransitionOrder, canTransitionReturn, type AdminOrderDetail, type AdminOrderRow, type AdminOverview } from "@/domain/admin";
import { ORDER_STATUSES } from "@/domain/checkout";
import type { ReturnStatus } from "@/domain/returns";
import { escapeLike } from "@/domain/search";
import type { OrderStatus } from "@/domain/types";
import { ConflictError, NotFoundError } from "../errors";
import { getOrderForAdmin } from "../orderService";
import { listReturnsForOrderAdmin } from "../returnService";

// Everything here assumes the caller is an admin (withAdmin / requireAdmin checked the DB role).

const itemCount = sql<number>`(select coalesce(sum(${orderItems.quantity}), 0)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`;

export async function listAdminOrders(filter: { status?: OrderStatus; q?: string }, limit = 200): Promise<AdminOrderRow[]> {
  const where: SQL[] = [];
  if (filter.status) where.push(eq(orders.status, filter.status));
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where.push(or(ilike(orders.id, pattern), ilike(users.email, pattern), ilike(users.name, pattern))!);
  }
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      createdAt: orders.createdAt,
      totalCents: orders.totalCents,
      itemCount,
      name: users.name,
      email: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    placedAt: r.createdAt.toISOString(),
    totalCents: r.totalCents,
    itemCount: Number(r.itemCount),
    customer: { name: r.name, email: r.email },
  }));
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderDetail> {
  const { order, userId } = await getOrderForAdmin(orderId);
  const [customer] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId));
  return { ...order, customer, returns: await listReturnsForOrderAdmin(orderId) };
}

/**
 * Moves an order along its lifecycle under a row lock (see ORDER_TRANSITIONS).
 *  - delivered: stamps delivered_at, which opens the 30-day return window.
 *  - cancelled: puts paid stock back (pending orders never took any) and releases the
 *    coupon redemption so a limited coupon becomes usable again.
 */
export async function updateOrderStatus(orderId: string, to: OrderStatus): Promise<AdminOrderDetail> {
  await withTransaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).for("update");
    if (!order) throw new NotFoundError("Order not found.");
    if (!canTransitionOrder(order.status, to)) throw new ConflictError(`Can't change an order from ${order.status} to ${to}.`);

    if (to === "cancelled") {
      if (order.status === "paid") {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        for (const item of items.toSorted((a, b) => a.productId.localeCompare(b.productId))) {
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} + ${item.quantity}` })
            .where(eq(products.id, item.productId));
        }
      }
      const released = await tx.delete(couponRedemptions).where(eq(couponRedemptions.orderId, orderId)).returning({ couponId: couponRedemptions.couponId });
      for (const r of released) {
        await tx
          .update(coupons)
          .set({ timesUsed: sql`greatest(${coupons.timesUsed} - 1, 0)` })
          .where(eq(coupons.id, r.couponId));
      }
    }

    await tx
      .update(orders)
      .set({ status: to, ...(to === "delivered" ? { deliveredAt: new Date() } : {}) })
      .where(eq(orders.id, orderId));
  });
  return getAdminOrder(orderId);
}

export async function updateReturnStatus(returnId: string, to: ReturnStatus): Promise<AdminOrderDetail> {
  const orderId = await withTransaction(async (tx) => {
    const [ret] = await tx.select().from(returns).where(eq(returns.id, returnId)).limit(1).for("update");
    if (!ret) throw new NotFoundError("Return not found.");
    if (!canTransitionReturn(ret.status, to)) throw new ConflictError(`Can't change a return from ${ret.status} to ${to}.`);
    await tx.update(returns).set({ status: to, updatedAt: new Date() }).where(eq(returns.id, returnId));
    return ret.orderId;
  });
  return getAdminOrder(orderId);
}

export async function getOverview(): Promise<AdminOverview> {
  const [byStatus, [revenue], [openReturns], lowStock, recentOrders] = await Promise.all([
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
    db
      .select({ cents: sum(orders.totalCents) })
      .from(orders)
      .where(inArray(orders.status, ["paid", "shipped", "delivered"])),
    db.select({ n: count() }).from(returns).where(inArray(returns.status, ["requested", "approved"])),
    db
      .select({ id: products.id, title: products.title, stock: products.stock })
      .from(products)
      .where(and(eq(products.archived, false), sql`${products.stock} < 5`))
      .orderBy(products.stock)
      .limit(10),
    listAdminOrders({}, 5),
  ]);
  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const row of byStatus) ordersByStatus[row.status] = row.n;
  return { ordersByStatus, revenueCents: Number(revenue.cents ?? 0), openReturns: openReturns.n, lowStock, recentOrders };
}
