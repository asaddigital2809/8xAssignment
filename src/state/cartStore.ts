"use client";

import { create } from "zustand";
import { httpCartRepository as repo } from "@/data/cartRepository";
import { UnauthorizedError } from "@/data/http";
import { cartItemCount } from "@/domain/cart";
import type { Cart } from "@/domain/types";
import { redirectToSignIn } from "./navigation";

type CartStatus = "loading" | "ready" | "signed-out" | "error";

type CartState = {
  cart: Cart | null;
  status: CartStatus;
  loadError?: string;
  /** Last failed mutation, shown near the cart; cleared by the next successful one. */
  mutationError?: string;
  /** Product id with a request in flight, so its buttons can be disabled. */
  busy?: string;
  load: () => Promise<void>;
  add: (productId: string, quantity: number) => Promise<boolean>;
  setQuantity: (productId: string, quantity: number) => Promise<boolean>;
  remove: (productId: string) => Promise<boolean>;
};

/**
 * The cart lives on the server (per user, survives restarts and devices). This store is
 * only a client cache of the server's answer: every mutation returns the recomputed cart,
 * so prices and totals shown are always the server's.
 */
export const useCartStore = create<CartState>()((set) => {
  async function mutate(productId: string, call: () => Promise<Cart>): Promise<boolean> {
    set({ busy: productId });
    try {
      set({ cart: await call(), status: "ready", mutationError: undefined, busy: undefined });
      return true;
    } catch (err) {
      set({ busy: undefined });
      if (err instanceof UnauthorizedError) {
        redirectToSignIn();
        return false;
      }
      set({ mutationError: err instanceof Error ? err.message : "Couldn't update your cart." });
      return false;
    }
  }

  return {
    cart: null,
    status: "loading",
    load: async () => {
      set((s) => ({ status: s.cart ? s.status : "loading", loadError: undefined }));
      try {
        set({ cart: await repo.get(), status: "ready" });
      } catch (err) {
        if (err instanceof UnauthorizedError) set({ cart: null, status: "signed-out" });
        else set({ status: "error", loadError: err instanceof Error ? err.message : "Couldn't load your cart." });
      }
    },
    add: (productId, quantity) => mutate(productId, () => repo.add(productId, quantity)),
    setQuantity: (productId, quantity) => mutate(productId, () => repo.setQuantity(productId, quantity)),
    remove: (productId) => mutate(productId, () => repo.remove(productId)),
  };
});

export const useCart = () => useCartStore((s) => s.cart);
export const useCartStatus = () => useCartStore((s) => s.status);
export const useCartCount = () => useCartStore((s) => (s.cart ? cartItemCount(s.cart.items) : 0));
