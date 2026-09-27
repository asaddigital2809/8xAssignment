"use client";

import type { Product } from "@/domain/types";

/**
 * Products already fetched by lists (home rails, search), keyed by id. Lets the product
 * page render instantly from what the user just clicked (needed for the shared-element
 * "hero" transition, which only forms if the destination renders in the same commit)
 * while fresh data loads in the background. Display only: prices and stock used for
 * anything that matters are always re-read by the server.
 */
const products = new Map<string, Product>();

export function rememberProducts<T extends Product[]>(list: T): T {
  for (const p of list) products.set(p.id, p);
  return list;
}

export function cachedProduct(id: string): Product | undefined {
  return products.get(id);
}
