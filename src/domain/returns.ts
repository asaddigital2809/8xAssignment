import type { OrderStatus } from "./types";

export type ReturnStatus = "requested" | "approved" | "rejected" | "refunded";
export type ReturnReason = "damaged" | "wrong_item" | "not_as_described" | "no_longer_needed" | "other";

export const RETURN_REASONS: Record<ReturnReason, string> = {
  damaged: "Arrived damaged",
  wrong_item: "Wrong item sent",
  not_as_described: "Not as described",
  no_longer_needed: "No longer needed",
  other: "Other",
};

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  refunded: "Refunded",
};

export const RETURN_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ReturnRequestView = {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  comment: string | null;
  refundCents: number;
  createdAt: string;
  items: { productId: string; title: string; thumbnail: string; quantity: number }[];
};

type Eligibility = { ok: true; closesAt: Date } | { ok: false; reason: string };

/** Returns are accepted for delivered orders, within RETURN_WINDOW_DAYS of delivery. */
export function returnEligibility(order: { status: OrderStatus; deliveredAt: Date | null }, now: Date): Eligibility {
  if (order.status !== "delivered" || !order.deliveredAt) {
    return { ok: false, reason: "Returns open once your order has been delivered." };
  }
  const closesAt = new Date(order.deliveredAt.getTime() + RETURN_WINDOW_DAYS * DAY_MS);
  if (now >= closesAt) return { ok: false, reason: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed.` };
  return { ok: true, closesAt };
}

type Qty = { productId: string; quantity: number };

/**
 * How many of each product can still be returned: purchased minus everything in
 * earlier return requests that weren't rejected (a rejected request frees its items).
 */
export function remainingReturnable(purchased: Qty[], earlier: { status: ReturnStatus; items: Qty[] }[]): Map<string, number> {
  const remaining = new Map(purchased.map((l) => [l.productId, l.quantity]));
  for (const r of earlier) {
    if (r.status === "rejected") continue;
    for (const i of r.items) remaining.set(i.productId, (remaining.get(i.productId) ?? 0) - i.quantity);
  }
  for (const [id, q] of remaining) remaining.set(id, Math.max(0, q));
  return remaining;
}

/** User-facing problem with the requested items, or null if they're all returnable. */
export function returnItemsProblem(requested: Qty[], remaining: Map<string, number>): string | null {
  const wanted = requested.filter((i) => i.quantity > 0);
  if (wanted.length === 0) return "Choose at least one item to return.";
  const seen = new Set<string>();
  for (const i of wanted) {
    if (seen.has(i.productId)) return "Each item can only be listed once.";
    seen.add(i.productId);
    if (!Number.isInteger(i.quantity)) return "Quantities must be whole numbers.";
    const left = remaining.get(i.productId);
    if (left === undefined) return "One of those items isn't part of this order.";
    if (i.quantity > left) return left === 0 ? "One of those items has already been returned." : `You can return at most ${left} of one of those items.`;
  }
  return null;
}

/**
 * Refund for the given items at the prices actually paid: the line value is scaled by
 * total/subtotal, so a coupon discount is shared pro rata and the refunds for an order
 * can never add up to more than its total. Floors to whole cents.
 */
export function refundFor(
  order: { subtotalCents: number; totalCents: number; lines: { productId: string; priceCents: number }[] },
  items: Qty[],
): number {
  if (order.subtotalCents <= 0) return 0;
  const price = new Map(order.lines.map((l) => [l.productId, l.priceCents]));
  const gross = items.reduce((sum, i) => sum + (price.get(i.productId) ?? 0) * i.quantity, 0);
  return Math.floor((gross * order.totalCents) / order.subtotalCents);
}
