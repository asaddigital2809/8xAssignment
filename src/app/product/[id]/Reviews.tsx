"use client";

import { useState, type FormEvent } from "react";
import { Stars } from "@/components/Stars";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import type { MyReview } from "@/data/reviewRepository";
import { REVIEW_BODY_MAX, REVIEW_MAX_IMAGES, REVIEW_TITLE_MAX, type RatingSummary, type ReviewSort, type ReviewView } from "@/domain/reviews";
import { redirectToSignIn } from "@/state/navigation";
import { useMyReview, useProductReviews, useReviewForm } from "@/state/reviews";
import { useSignedIn } from "@/state/session";

export function Reviews({ productId }: { productId: string }) {
  const [sort, setSort] = useState<ReviewSort>("recent");
  const reviews = useProductReviews(productId, sort);
  const signedIn = useSignedIn();
  const mine = useMyReview(productId, signedIn === true);
  const [editing, setEditing] = useState(false);

  const { state, retry } = reviews;
  return (
    <section aria-labelledby="reviews-heading" className="grid gap-6 rounded bg-white p-4 shadow-sm md:grid-cols-[260px_1fr]">
      <div className="space-y-4">
        <h2 id="reviews-heading" className="text-xl font-semibold">
          Customer reviews
        </h2>
        {state.status === "success" && <Summary summary={state.data.summary} />}
        <WriteReviewCta
          signedIn={signedIn}
          hasReview={mine.state.status === "success" && mine.state.data !== null}
          onWrite={() => setEditing(true)}
          productId={productId}
        />
      </div>

      <div className="space-y-4">
        {editing && mine.state.status === "success" && (
          <ReviewForm
            productId={productId}
            initial={mine.state.data}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              mine.retry();
              retry();
            }}
          />
        )}

        {state.status === "success" && state.data.reviews.length > 0 && (
          <label className="flex items-center justify-end gap-2 text-sm">
            Sort by
            <select name="reviewSort" value={sort} onChange={(e) => setSort(e.target.value as ReviewSort)} className="rounded border border-gray-300 px-2 py-1">
              <option value="recent">Most recent</option>
              <option value="helpful">Most helpful</option>
            </select>
          </label>
        )}
        {state.status === "loading" && <Spinner label="Loading reviews…" />}
        {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
        {state.status === "success" && state.data.reviews.length === 0 && !editing && (
          <EmptyView title="No reviews yet">Be the first to share what you think.</EmptyView>
        )}
        {state.status === "success" && (
          <ul className="divide-y">
            {state.data.reviews.map((r) => (
              <ReviewItem key={r.id} review={r} signedIn={signedIn} onHelpful={() => reviews.toggleHelpful(r.id)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Summary({ summary }: { summary: RatingSummary }) {
  if (summary.count === 0) return <p className="text-sm text-gray-600">No ratings yet.</p>;
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2">
        <Stars rating={summary.average} size="text-xl" />
        <span className="font-medium">{summary.average.toFixed(1)} out of 5</span>
      </p>
      <p className="text-sm text-gray-600">
        {summary.count} {summary.count === 1 ? "rating" : "ratings"}
      </p>
      <ul className="space-y-1 text-sm">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const pct = Math.round((summary.distribution[star] / summary.count) * 100);
          return (
            <li key={star} className="flex items-center gap-2">
              <span className="w-10">{star} star</span>
              <span className="h-3 flex-1 overflow-hidden rounded bg-gray-100" aria-hidden>
                <span className="block h-full bg-amber-400" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-9 text-right text-gray-600">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WriteReviewCta(props: { signedIn: boolean | undefined; hasReview: boolean; onWrite: () => void; productId: string }) {
  if (props.signedIn === undefined) return null;
  return (
    <div className="border-t pt-4">
      <p className="font-medium">{props.hasReview ? "You reviewed this product" : "Review this product"}</p>
      <p className="mb-2 text-sm text-gray-600">{props.hasReview ? "You can update your review at any time." : "Share your thoughts with other customers."}</p>
      <button
        onClick={() => (props.signedIn ? props.onWrite() : redirectToSignIn(`/product/${props.productId}`))}
        className="w-full rounded-full border border-gray-300 py-1.5 text-sm font-medium hover:bg-gray-50"
      >
        {props.hasReview ? "Edit your review" : props.signedIn ? "Write a review" : "Sign in to write a review"}
      </button>
    </div>
  );
}

function ReviewItem({ review: r, signedIn, onHelpful }: { review: ReviewView; signedIn: boolean | undefined; onHelpful: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const edited = r.updatedAt !== r.createdAt;
  return (
    <li className="space-y-1 py-4">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{r.author}</span>
        {r.isMine && <span className="rounded bg-gray-100 px-1.5 text-xs text-gray-600">Your review</span>}
      </p>
      <p className="flex flex-wrap items-center gap-2">
        <Stars rating={r.rating} size="text-sm" />
        {r.title && <span className="font-semibold">{r.title}</span>}
      </p>
      <p className="text-xs text-gray-500">
        {new Date(r.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
        {edited && " · edited"}
        {r.verifiedPurchase && <span className="ml-2 font-semibold text-amber-700">Verified Purchase</span>}
      </p>
      {/* Plain text only: React escapes it, and line breaks are kept via CSS. */}
      <p className="whitespace-pre-line text-sm">{r.body}</p>
      {r.images.length > 0 && (
        <div className="flex gap-2 pt-1">
          {r.images.map((img) => (
            <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element -- user photos from our own image endpoint */}
              <img src={img.url} alt={`Photo from ${r.author}`} className="h-full w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <p className="flex items-center gap-3 pt-1 text-sm text-gray-600">
        {r.helpfulCount > 0 && <span>{r.helpfulCount === 1 ? "1 person found this helpful" : `${r.helpfulCount} people found this helpful`}</span>}
        {!r.isMine && signedIn !== undefined && (
          <button
            onClick={async () => {
              if (!signedIn) return redirectToSignIn();
              setBusy(true);
              await onHelpful();
              setBusy(false);
            }}
            disabled={busy}
            aria-pressed={r.votedHelpful}
            className={`rounded-full border px-3 py-0.5 text-xs ${r.votedHelpful ? "border-amber-500 bg-amber-50 text-amber-800" : "border-gray-300 hover:bg-gray-50"} disabled:opacity-50`}
          >
            {r.votedHelpful ? "✓ Helpful" : "Helpful"}
          </button>
        )}
      </p>
    </li>
  );
}

function ReviewForm(props: { productId: string; initial: MyReview | null; onCancel: () => void; onSaved: () => void }) {
  const form = useReviewForm(props.productId, props.initial);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (await form.submit()) props.onSaved();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded border border-amber-200 bg-amber-50/40 p-4">
      <h3 className="font-semibold">{props.initial ? "Edit your review" : "Write a review"}</h3>
      <fieldset>
        <legend className="text-sm">Overall rating</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-2xl leading-none" title={`${n} star${n > 1 ? "s" : ""}`}>
              <input type="radio" name="rating" value={n} checked={form.rating === n} onChange={() => form.setRating(n)} className="sr-only" />
              <span className={n <= form.rating ? "text-amber-500" : "text-gray-300"} aria-hidden>
                ★
              </span>
              <span className="sr-only">{n} stars</span>
            </label>
          ))}
        </div>
        {form.errors.rating && <span className="text-xs text-red-700">{form.errors.rating}</span>}
      </fieldset>
      <label className="block text-sm">
        Headline (optional)
        <input
          name="title"
          value={form.title}
          maxLength={REVIEW_TITLE_MAX}
          onChange={(e) => form.setTitle(e.target.value)}
          className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Your review
        <textarea
          name="body"
          value={form.body}
          maxLength={REVIEW_BODY_MAX}
          rows={4}
          onChange={(e) => form.setBody(e.target.value)}
          aria-invalid={Boolean(form.errors.body)}
          className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 aria-[invalid=true]:border-red-500"
        />
        {form.errors.body && <span className="text-xs text-red-700">{form.errors.body}</span>}
      </label>
      <div className="space-y-2 text-sm">
        <p>Photos (optional, up to {REVIEW_MAX_IMAGES}, JPEG/PNG/WebP, 2 MB each)</p>
        <div className="flex flex-wrap items-center gap-2">
          {form.images.map((img) => (
            <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- just-uploaded photo preview */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => form.removePhoto(img.id)}
                aria-label="Remove photo"
                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          {form.images.length < REVIEW_MAX_IMAGES && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded border border-dashed bg-white text-xs text-gray-600 hover:bg-gray-50">
              {form.uploading ? "Uploading…" : "+ Add photo"}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={form.uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void form.addPhoto(file);
                }}
              />
            </label>
          )}
        </div>
      </div>
      {form.error && <p role="alert" className="text-sm text-red-700">{form.error}</p>}
      <div className="flex gap-3">
        <button disabled={form.saving || form.uploading} className="rounded-full bg-amber-400 px-5 py-2 text-sm font-medium hover:bg-amber-500 disabled:opacity-60">
          {form.saving ? "Submitting…" : "Submit review"}
        </button>
        <button type="button" onClick={props.onCancel} className="text-sm text-blue-700 hover:underline">
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-500">Reviews from customers with a paid order for this item show a Verified Purchase badge.</p>
    </form>
  );
}
