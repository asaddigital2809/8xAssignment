"use client";

import { useEffect } from "react";
import { useCartStore } from "@/state/cartStore";
import { useWishlistStore } from "@/state/wishlistStore";

/**
 * Loads the signed-in user's server cart and wish list into the client stores. Rendered
 * by the (server) AccountNav with the current user id, so signing in, out, or switching
 * accounts reloads them: layouts don't remount on navigation, but props do change.
 */
export function SessionDataLoader({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (userId) {
      void useCartStore.getState().load();
      void useWishlistStore.getState().load();
    } else {
      useCartStore.setState({ cart: null, status: "signed-out" });
      useWishlistStore.setState({ items: [], status: "signed-out" });
    }
  }, [userId]);
  return null;
}
