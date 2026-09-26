import type { Cart } from "@/domain/types";
import { getJson, sendJson } from "./http";

/** Every mutation returns the server's recomputed cart; the client never computes prices. */
export interface CartRepository {
  get(signal?: AbortSignal): Promise<Cart>;
  add(productId: string, quantity: number): Promise<Cart>;
  setQuantity(productId: string, quantity: number): Promise<Cart>;
  remove(productId: string): Promise<Cart>;
}

const item = (productId: string) => `/api/cart/items/${encodeURIComponent(productId)}`;

export const httpCartRepository: CartRepository = {
  get: (signal) => getJson<Cart>("/api/cart", signal),
  add: (productId, quantity) => sendJson<Cart>("POST", "/api/cart/items", { productId, quantity }),
  setQuantity: (productId, quantity) => sendJson<Cart>("PATCH", item(productId), { quantity }),
  remove: (productId) => sendJson<Cart>("DELETE", item(productId)),
};
