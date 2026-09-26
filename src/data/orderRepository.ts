import type { Address, Order } from "@/domain/types";
import { getJson, sendJson } from "./http";

export interface OrderRepository {
  list(signal?: AbortSignal): Promise<Order[]>;
  getById(id: string, signal?: AbortSignal): Promise<Order>;
  /** Creates a pending order from the server-side cart. Same key => same order. */
  create(address: Address, idempotencyKey: string): Promise<Order>;
  pay(id: string): Promise<Order>;
}

const order = (id: string) => `/api/orders/${encodeURIComponent(id)}`;

export const httpOrderRepository: OrderRepository = {
  list: (signal) => getJson<Order[]>("/api/orders", signal),
  getById: (id, signal) => getJson<Order>(order(id), signal),
  create: (address, idempotencyKey) => sendJson<Order>("POST", "/api/orders", { address, idempotencyKey }),
  pay: (id) => sendJson<Order>("POST", `${order(id)}/pay`),
};
