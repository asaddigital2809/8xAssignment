"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addToCart, cartItemCount, cartSubtotal, removeFromCart, setQuantity } from "@/domain/cart";
import type { CartItem, Product } from "@/domain/types";

type CartState = {
  items: CartItem[];
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

// The store only wires domain functions to state; all cart rules live in @/domain/cart.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (product, quantity = 1) => set((s) => ({ items: addToCart(s.items, product, quantity) })),
      setQuantity: (productId, quantity) => set((s) => ({ items: setQuantity(s.items, productId, quantity) })),
      remove: (productId) => set((s) => ({ items: removeFromCart(s.items, productId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "amzn.cart.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      // Rehydrated from <StoreHydrator> after mount, so server and first client render match.
      skipHydration: true,
    },
  ),
);

export const useCartItems = () => useCartStore((s) => s.items);
export const useCartCount = () => useCartStore((s) => cartItemCount(s.items));
export const useCartSubtotal = () => useCartStore((s) => cartSubtotal(s.items));

/** False until the persisted cart has been loaded, so pages can show a loading state instead of "empty". */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useCartStore.persist.onFinishHydration(onChange),
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}
