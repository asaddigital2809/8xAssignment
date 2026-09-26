import type { RatingSummary, ReviewSort, ReviewView } from "@/domain/reviews";
import { getJson, sendJson, uploadFile } from "./http";

export type ProductReviews = { summary: RatingSummary; reviews: ReviewView[] };
export type MyReview = { rating: number; title: string; body: string; images: { id: string; url: string }[] };
export type UploadedImage = { id: string; url: string };

const base = (productId: string) => `/api/products/${encodeURIComponent(productId)}/reviews`;

export const reviewRepository = {
  list: (productId: string, sort: ReviewSort, signal?: AbortSignal) => getJson<ProductReviews>(`${base(productId)}?sort=${sort}`, signal),
  /** null when the user hasn't reviewed the product yet. */
  mine: (productId: string, signal?: AbortSignal) => getJson<MyReview | null>(`${base(productId)}/mine`, signal),
  save: (productId: string, input: { rating: number; title: string; body: string; imageIds: string[] }) =>
    sendJson<MyReview>("PUT", `${base(productId)}/mine`, input),
  toggleHelpful: (reviewId: string) =>
    sendJson<{ helpfulCount: number; votedHelpful: boolean }>("POST", `/api/reviews/${encodeURIComponent(reviewId)}/helpful`),
  uploadPhoto: (file: File) => uploadFile<UploadedImage>("/api/uploads", file),
};
