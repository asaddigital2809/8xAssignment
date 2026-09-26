import "server-only";
import catalog from "@/data/catalog.json";
import { matchesQuery } from "@/domain/search";
import type { Category, Product, ProductQuery } from "@/domain/types";

// The catalog is a static snapshot of dummyjson.com, bundled so the app has no runtime
// dependency on a third-party API. Swapping this module for a DB/API client is the only
// change needed to use a real backend; the HTTP contract in /api stays the same.
const categories: Category[] = catalog.categories;
const products: Product[] = catalog.products;
const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

export function listCategories(): Category[] {
  return categories;
}

export function searchProducts(query: ProductQuery): Product[] {
  return products.filter((p) => matchesQuery(p, query, categoryNames.get(p.categoryId)));
}

/** Top-rated in-stock products, used for the home page rail. */
export function listFeatured(limit = 12): Product[] {
  return products
    .filter((p) => p.stock > 0)
    .toSorted((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
