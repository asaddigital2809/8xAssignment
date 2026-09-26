"use client";

import { create } from "zustand";
import { UnauthorizedError } from "@/data/http";
import { wishlistRepository as repo } from "@/data/wishlistRepository";
import type { WishlistItem } from "@/domain/types";
import { useCartStore } from "./cartStore";
import { redirectToSignIn } from "./navigation";

type Status = "loading" | "ready" | "signed-out" | "error";

type WishlistState = {
  items: WishlistItem[];
  status: Status;
  loadError?: string;
  mutationError?: string;
  busy?: string;
  load: () => Promise<void>;
  add: (productId: string) => Promise<boolean>;
  remove: (productId: string) => Promise<boolean>;
  moveToCart: (productId: string) => Promise<boolean>;
};

/** Client cache of the server wish list; every mutation returns the server's list. */
export const useWishlistStore = create<WishlistState>()((set) => {
  async function mutate(productId: string, call: () => Promise<WishlistItem[]>): Promise<boolean> {
    set({ busy: productId });
    try {
      set({ items: await call(), status: "ready", mutationError: undefined, busy: undefined });
      return true;
    } catch (err) {
      set({ busy: undefined });
      if (err instanceof UnauthorizedError) {
        redirectToSignIn();
        return false;
      }
      set({ mutationError: err instanceof Error ? err.message : "Couldn't update your wish list." });
      return false;
    }
  }

  return {
    items: [],
    status: "loading",
    load: async () => {
      set({ loadError: undefined });
      try {
        set({ items: await repo.list(), status: "ready" });
      } catch (err) {
        if (err instanceof UnauthorizedError) set({ items: [], status: "signed-out" });
        else set({ status: "error", loadError: err instanceof Error ? err.message : "Couldn't load your wish list." });
      }
    },
    add: (productId) => mutate(productId, () => repo.add(productId)),
    remove: (productId) => mutate(productId, () => repo.remove(productId)),
    moveToCart: (productId) =>
      mutate(productId, async () => {
        const { wishlist, cart } = await repo.moveToCart(productId);
        useCartStore.setState({ cart, status: "ready" }); // header count and cart page stay in sync
        return wishlist;
      }),
  };
});

export const useIsSaved = (productId: string) => useWishlistStore((s) => s.items.some((i) => i.productId === productId));
