"use client";

import { create } from "zustand";

/**
 * Which card is "flying" to the product page. View-transition names must be unique on a
 * page, and the same product can appear in several rails, so only the card the user
 * actually opened carries the shared name (like Flutter's Hero tag on the tapped item).
 */
export const useHeroStore = create<{ source: string | null; setSource: (key: string) => void }>()((set) => ({
  source: null,
  setSource: (key) => set({ source: key }),
}));

export const heroName = (productId: string) => `product-hero-${productId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
