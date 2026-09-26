import type { ReturnReason, ReturnRequestView } from "@/domain/returns";
import { getJson, sendJson } from "./http";

export type ReturnOptions = {
  eligible: boolean;
  reason: string | null;
  closesAt: string | null;
  items: { productId: string; title: string; thumbnail: string; purchased: number; remaining: number }[];
};

export type ReturnInput = {
  items: { productId: string; quantity: number }[];
  reason: ReturnReason;
  comment?: string;
};

const orderReturns = (orderId: string) => `/api/orders/${encodeURIComponent(orderId)}/returns`;

export const returnRepository = {
  options: (orderId: string, signal?: AbortSignal) => getJson<ReturnOptions>(orderReturns(orderId), signal),
  /** Only items, reason and comment are sent; the refund is computed server-side. */
  create: (orderId: string, input: ReturnInput) => sendJson<ReturnRequestView>("POST", orderReturns(orderId), input),
  list: (signal?: AbortSignal) => getJson<ReturnRequestView[]>("/api/returns", signal),
};
