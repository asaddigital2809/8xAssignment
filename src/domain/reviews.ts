import type { OrderStatus } from "./types";

export const REVIEW_TITLE_MAX = 100;
export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 2000;
export const REVIEW_MAX_IMAGES = 3;

export type ReviewInput = { rating: number; title: string; body: string; imageIds: string[] };
export type ReviewErrors = Partial<Record<"rating" | "title" | "body" | "imageIds", string>>;

export function validateReview(input: ReviewInput): ReviewErrors {
  const errors: ReviewErrors = {};
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) errors.rating = "Choose a rating from 1 to 5 stars.";
  if (input.title.trim().length > REVIEW_TITLE_MAX) errors.title = `Keep the headline under ${REVIEW_TITLE_MAX} characters.`;
  const body = input.body.trim();
  if (body.length < REVIEW_BODY_MIN) errors.body = `Write at least ${REVIEW_BODY_MIN} characters.`;
  else if (body.length > REVIEW_BODY_MAX) errors.body = `Keep your review under ${REVIEW_BODY_MAX} characters.`;
  if (input.imageIds.length > REVIEW_MAX_IMAGES) errors.imageIds = `Add at most ${REVIEW_MAX_IMAGES} photos.`;
  else if (new Set(input.imageIds).size !== input.imageIds.length) errors.imageIds = "The same photo was added twice.";
  return errors;
}

/** Order statuses that count as "bought it" for the Verified Purchase badge. */
export const VERIFIED_PURCHASE_STATUSES: OrderStatus[] = ["paid", "shipped", "delivered"];

/** Public author label: first name and last initial, never the email address. */
export function reviewerDisplayName(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export type RatingSummary = {
  average: number; // one decimal
  count: number;
  /** counts for 5, 4, 3, 2, 1 stars */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function summarizeRatings(ratings: number[]): RatingSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary["distribution"];
  for (const r of ratings) if (r >= 1 && r <= 5) distribution[r as 1 | 2 | 3 | 4 | 5]++;
  const count = ratings.length;
  const average = count ? Math.round((ratings.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;
  return { average, count, distribution };
}

export type ReviewView = {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  /** For the signed-in viewer (false when signed out). */
  votedHelpful: boolean;
  isMine: boolean;
  images: { id: string; url: string }[];
};

export type ReviewSort = "recent" | "helpful";
