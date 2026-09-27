"use client";

import { httpProductRepository as products } from "@/data/productRepository";
import type { Product, ProductQuery } from "@/domain/types";
import { cachedProduct, rememberProducts } from "./productCache";
import { useAsync, type AsyncState } from "./useAsync";

export const useCategories = () => useAsync("categories", (signal) => products.listCategories(signal));

export const useFeaturedProducts = () => useAsync("featured", (signal) => products.listFeatured(signal).then(rememberProducts));

export const useProductSearch = (query: ProductQuery) =>
  useAsync(`search:${query.text ?? ""}:${query.categoryId ?? ""}`, (signal) => products.search(query, signal).then(rememberProducts));

/**
 * A single product. While the request is in flight, a copy the user just saw in a list is
 * shown immediately (stale-while-revalidate), so the page renders on the first commit.
 */
export function useProduct(id: string) {
  const q = useAsync(`product:${id}`, (signal) => products.getById(id, signal));
  const cached = cachedProduct(id);
  if (q.state.status === "loading" && cached) {
    const state: AsyncState<Product> = { status: "success", data: cached };
    return { ...q, state };
  }
  return q;
}
