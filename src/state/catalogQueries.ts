"use client";

import { httpProductRepository as products } from "@/data/productRepository";
import type { ProductQuery } from "@/domain/types";
import { useAsync } from "./useAsync";

export const useCategories = () => useAsync("categories", (signal) => products.listCategories(signal));

export const useFeaturedProducts = () => useAsync("featured", (signal) => products.listFeatured(signal));

export const useProductSearch = (query: ProductQuery) =>
  useAsync(`search:${query.text ?? ""}:${query.categoryId ?? ""}`, (signal) => products.search(query, signal));

export const useProduct = (id: string) => useAsync(`product:${id}`, (signal) => products.getById(id, signal));
