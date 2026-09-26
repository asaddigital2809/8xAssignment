import type { Product, ProductQuery } from "./types";

/** Every whitespace-separated term must appear in the product's searchable text. */
export function matchesQuery(product: Product, query: ProductQuery, categoryName = ""): boolean {
  if (query.categoryId && product.categoryId !== query.categoryId) return false;

  const terms = (query.text ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = [product.title, product.brand ?? "", product.description, categoryName]
    .join(" ")
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}
