import type { ProductQuery } from "./types";

export const MAX_QUERY_LENGTH = 100;
export const MAX_TERMS = 8;
const SLUG = /^[a-z0-9-]{1,50}$/;

export type SanitizedQuery = {
  /** Lower-cased terms; each must match somewhere in the product's searchable text. */
  terms: string[];
  /** undefined = no filter; null = a filter was given but is malformed (matches nothing). */
  categoryId: string | undefined | null;
};

/**
 * Normalizes untrusted search input before it reaches the database: strips control
 * characters, caps length and term count, and validates the category slug.
 * Values are still passed as bound parameters; this bounds the work and keeps
 * LIKE wildcards literal (see escapeLike).
 */
export function sanitizeQuery(query: ProductQuery): SanitizedQuery {
  const text = (query.text ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase();
  const terms = [...new Set(text.split(/\s+/).filter(Boolean))].slice(0, MAX_TERMS);

  const rawCategory = query.categoryId?.trim();
  const categoryId = !rawCategory ? undefined : SLUG.test(rawCategory) ? rawCategory : null;

  return { terms, categoryId };
}

/** Escapes LIKE/ILIKE metacharacters so user input matches literally. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => "\\" + c);
}
