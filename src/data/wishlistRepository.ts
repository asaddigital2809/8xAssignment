import type { Cart, WishlistItem } from "@/domain/types";
import { getJson, sendJson } from "./http";

const item = (productId: string) => `/api/wishlist/${encodeURIComponent(productId)}`;

export const wishlistRepository = {
  list: (signal?: AbortSignal) => getJson<WishlistItem[]>("/api/wishlist", signal),
  add: (productId: string) => sendJson<WishlistItem[]>("POST", "/api/wishlist", { productId }),
  remove: (productId: string) => sendJson<WishlistItem[]>("DELETE", item(productId)),
  moveToCart: (productId: string) => sendJson<{ wishlist: WishlistItem[]; cart: Cart }>("POST", `${item(productId)}/move-to-cart`),
};
