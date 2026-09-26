"use client";

import { useState } from "react";
import { reviewRepository as repo, type MyReview, type UploadedImage } from "@/data/reviewRepository";
import { REVIEW_MAX_IMAGES, validateReview, type ReviewErrors, type ReviewSort } from "@/domain/reviews";
import { MAX_UPLOAD_BYTES } from "@/domain/uploads";
import { attempt } from "./mutation";
import { useAsync } from "./useAsync";

export function useProductReviews(productId: string, sort: ReviewSort) {
  const q = useAsync(`reviews:${productId}:${sort}`, (signal) => repo.list(productId, sort, signal));

  /** Helpful toggle; updates the one review in place from the server's answer. */
  async function toggleHelpful(reviewId: string) {
    const result = await attempt(() => repo.toggleHelpful(reviewId));
    if (result.ok && q.state.status === "success") {
      q.replace({
        ...q.state.data,
        reviews: q.state.data.reviews.map((r) => (r.id === reviewId ? { ...r, ...result.data } : r)),
      });
    }
    return result;
  }

  return { ...q, toggleHelpful };
}

/** The signed-in user's own review for the product, or null if they haven't written one. */
export const useMyReview = (productId: string, enabled: boolean) =>
  useAsync(`my-review:${productId}:${enabled}`, (signal): Promise<MyReview | null> =>
    enabled ? repo.mine(productId, signal) : Promise.resolve(null),
  );

/** Write/edit form: rating, headline, text and up to 3 photos (each uploaded when chosen). */
export function useReviewForm(productId: string, initial: MyReview | null) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [images, setImages] = useState<UploadedImage[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const input = { rating, title, body, imageIds: images.map((i) => i.id) };
  const errors: ReviewErrors = submitted ? validateReview(input) : {};

  async function addPhoto(file: File) {
    if (images.length >= REVIEW_MAX_IMAGES) return setError(`Add at most ${REVIEW_MAX_IMAGES} photos.`);
    if (file.size > MAX_UPLOAD_BYTES) return setError("Images must be 2 MB or smaller.");
    setUploading(true);
    const result = await attempt(() => repo.uploadPhoto(file));
    setUploading(false);
    if (!result.ok) return setError(result.error);
    setError(undefined);
    setImages((list) => [...list, result.data]);
  }

  /** Returns the saved review, or undefined if validation or the request failed. */
  async function submit(): Promise<MyReview | undefined> {
    setSubmitted(true);
    if (Object.keys(validateReview(input)).length > 0) return undefined;
    setSaving(true);
    const result = await attempt(() => repo.save(productId, input));
    setSaving(false);
    setError(result.ok ? undefined : result.error);
    return result.ok ? result.data : undefined;
  }

  return {
    rating,
    setRating,
    title,
    setTitle,
    body,
    setBody,
    images,
    addPhoto,
    removePhoto: (id: string) => setImages((list) => list.filter((i) => i.id !== id)),
    uploading,
    errors,
    error,
    saving,
    submit,
  };
}
