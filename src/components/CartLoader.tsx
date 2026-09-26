"use client";

import { useEffect } from "react";
import { useCartStore } from "@/state/cartStore";

/**
 * Loads the signed-in user's server cart into the client store. Rendered by the
 * (server) AccountNav with the current user id, so signing in, out, or switching
 * accounts reloads it: layouts don't remount on navigation, but props do change.
 */
export function CartLoader({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (userId) void useCartStore.getState().load();
    else useCartStore.setState({ cart: null, status: "signed-out" });
  }, [userId]);
  return null;
}
