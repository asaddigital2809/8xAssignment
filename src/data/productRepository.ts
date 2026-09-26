import type { Category, Product, ProductQuery } from "@/domain/types";
import { getJson } from "./http";

export interface ProductRepository {
  listCategories(signal?: AbortSignal): Promise<Category[]>;
  listFeatured(signal?: AbortSignal): Promise<Product[]>;
  search(query: ProductQuery, signal?: AbortSignal): Promise<Product[]>;
  getById(id: string, signal?: AbortSignal): Promise<Product>;
}

export const httpProductRepository: ProductRepository = {
  listCategories: (signal) => getJson<Category[]>("/api/categories", signal),
  listFeatured: (signal) => getJson<Product[]>("/api/products?featured=1", signal),
  search: (query, signal) => {
    const params = new URLSearchParams();
    if (query.text) params.set("q", query.text);
    if (query.categoryId) params.set("category", query.categoryId);
    return getJson<Product[]>(`/api/products?${params}`, signal);
  },
  getById: (id, signal) => getJson<Product>(`/api/products/${encodeURIComponent(id)}`, signal),
};
