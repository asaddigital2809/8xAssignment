"use client";

import { useEffect } from "react";
import { useCartStore } from "@/state/cartStore";

/** Loads the persisted cart after mount (see `skipHydration` in the cart store). */
export function StoreHydrator() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
  return null;
}
