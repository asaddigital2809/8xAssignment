import type { CheckoutQuote, Order, OrderStatus } from "@/domain/types";
import { getJson, sendJson } from "./http";

/** What the client chooses at checkout. Never amounts: those are computed server-side. */
export type CheckoutSelection = { addressId: string; paymentMethodId: string; couponCode?: string };

export interface OrderRepository {
  list(status?: OrderStatus, signal?: AbortSignal): Promise<Order[]>;
  getById(id: string, signal?: AbortSignal): Promise<Order>;
  quote(couponCode: string | undefined, signal?: AbortSignal): Promise<CheckoutQuote>;
  /** Creates a pending order from the server-side cart. Same key => same order. */
  create(selection: CheckoutSelection, idempotencyKey: string): Promise<Order>;
  pay(id: string): Promise<Order>;
}

const order = (id: string) => `/api/orders/${encodeURIComponent(id)}`;

export const httpOrderRepository: OrderRepository = {
  list: (status, signal) => getJson<Order[]>(status ? `/api/orders?status=${encodeURIComponent(status)}` : "/api/orders", signal),
  getById: (id, signal) => getJson<Order>(order(id), signal),
  quote: (couponCode) => sendJson<CheckoutQuote>("POST", "/api/checkout/quote", { couponCode }),
  create: (selection, idempotencyKey) => sendJson<Order>("POST", "/api/orders", { ...selection, idempotencyKey }),
  pay: (id) => sendJson<Order>("POST", `${order(id)}/pay`),
};
