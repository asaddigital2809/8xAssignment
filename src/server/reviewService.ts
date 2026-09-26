import "server-only";
import { and, asc, count, desc, eq, exists, inArray, ne, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db/client";
import { orderItems, orders, products, reviewImages, reviews, reviewVotes, uploads, users } from "@/db/schema";
import {
  reviewerDisplayName,
  summarizeRatings,
  validateReview,
  VERIFIED_PURCHASE_STATUSES,
  type RatingSummary,
  type ReviewInput,
  type ReviewSort,
  type ReviewView,
} from "@/domain/reviews";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";
import { imageUrl } from "./uploadService";

/**
 * Verified Purchase: the reviewer has an order containing this product that was actually
 * paid (paid/shipped/delivered). Evaluated at read time, so it tracks the orders' current
 * state instead of a flag frozen when the review was written.
 */
const verifiedPurchase = exists(
  db
    .select({ one: sql`1` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orderItems.productId, reviews.productId),
        eq(orders.userId, reviews.userId),
        inArray(orders.status, VERIFIED_PURCHASE_STATUSES),
      ),
    ),
);

const helpfulCount = sql<number>`(select count(*)::int from ${reviewVotes} where ${reviewVotes.reviewId} = ${reviews.id})`;

async function assertProduct(productId: string) {
  const [p] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!p) throw new NotFoundError("Product not found.");
}

export type ProductReviews = { summary: RatingSummary; reviews: ReviewView[] };

/** Public: a product's reviews and rating summary; per-viewer flags when signed in. */
export async function listReviews(productId: string, viewerId: string | null, sort: ReviewSort): Promise<ProductReviews> {
  await assertProduct(productId);

  const rows = await db
    .select({
      id: reviews.id,
      userId: reviews.userId,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      authorName: users.name,
      verifiedPurchase: sql<boolean>`${verifiedPurchase}`,
      helpfulCount,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(eq(reviews.productId, productId))
    .orderBy(...(sort === "helpful" ? [desc(helpfulCount), desc(reviews.updatedAt)] : [desc(reviews.updatedAt)]))
    .limit(100);

  const ids = rows.map((r) => r.id);
  const [images, myVotes, ratingRows] = await Promise.all([
    ids.length
      ? db.select().from(reviewImages).where(inArray(reviewImages.reviewId, ids)).orderBy(asc(reviewImages.position))
      : Promise.resolve([]),
    ids.length && viewerId
      ? db.select({ reviewId: reviewVotes.reviewId }).from(reviewVotes).where(and(eq(reviewVotes.userId, viewerId), inArray(reviewVotes.reviewId, ids)))
      : Promise.resolve([]),
    db.select({ rating: reviews.rating, n: count() }).from(reviews).where(eq(reviews.productId, productId)).groupBy(reviews.rating),
  ]);
  const voted = new Set(myVotes.map((v) => v.reviewId));

  return {
    summary: summarizeRatings(ratingRows.flatMap((r) => Array<number>(r.n).fill(r.rating))),
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: reviewerDisplayName(r.authorName),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      verifiedPurchase: Boolean(r.verifiedPurchase),
      helpfulCount: Number(r.helpfulCount),
      votedHelpful: voted.has(r.id),
      isMine: r.userId === viewerId,
      images: images.filter((i) => i.reviewId === r.id).map((i) => ({ id: i.uploadId, url: imageUrl(i.uploadId) })),
    })),
  };
}

export type MyReview = { rating: number; title: string; body: string; images: { id: string; url: string }[] };

/** The caller's review of a product, or null if they haven't written one (a normal state, not a 404). */
export async function getMyReview(userId: string, productId: string): Promise<MyReview | null> {
  await assertProduct(productId);
  const [row] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.userId, userId)))
    .limit(1);
  if (!row) return null;
  const images = await db.select().from(reviewImages).where(eq(reviewImages.reviewId, row.id)).orderBy(asc(reviewImages.position));
  return { rating: row.rating, title: row.title, body: row.body, images: images.map((i) => ({ id: i.uploadId, url: imageUrl(i.uploadId) })) };
}

/**
 * Creates or updates (one per user per product) the caller's review. Photos must be the
 * caller's own review uploads, not already attached to another review. The product's
 * rating/review count are recomputed in the same transaction.
 */
export async function upsertReview(userId: string, productId: string, input: ReviewInput): Promise<MyReview> {
  const errors = validateReview(input);
  const first = Object.values(errors)[0];
  if (first) throw new BadRequestError(first);
  await assertProduct(productId);

  await withTransaction(async (tx) => {
    const [review] = await tx
      .insert(reviews)
      .values({ productId, userId, rating: input.rating, title: input.title.trim(), body: input.body.trim() })
      .onConflictDoUpdate({
        target: [reviews.productId, reviews.userId],
        set: { rating: input.rating, title: input.title.trim(), body: input.body.trim(), updatedAt: new Date() },
      })
      .returning({ id: reviews.id });

    if (input.imageIds.length > 0) {
      const usable = await tx
        .select({ id: uploads.id })
        .from(uploads)
        .where(and(inArray(uploads.id, input.imageIds), eq(uploads.ownerId, userId), eq(uploads.purpose, "review")));
      const takenElsewhere = await tx
        .select({ id: reviewImages.uploadId })
        .from(reviewImages)
        .where(and(inArray(reviewImages.uploadId, input.imageIds), ne(reviewImages.reviewId, review.id)));
      if (usable.length !== input.imageIds.length || takenElsewhere.length > 0) {
        throw new BadRequestError("One of those photos can't be used. Upload it again.");
      }
    }

    await tx.delete(reviewImages).where(eq(reviewImages.reviewId, review.id));
    if (input.imageIds.length > 0) {
      await tx.insert(reviewImages).values(input.imageIds.map((uploadId, position) => ({ reviewId: review.id, uploadId, position })));
    }

    const [agg] = await tx
      .select({ avg: sql<string>`avg(${reviews.rating})`, n: count() })
      .from(reviews)
      .where(eq(reviews.productId, productId));
    await tx
      .update(products)
      .set({ rating: Math.round(Number(agg.avg) * 10) / 10, reviewCount: agg.n })
      .where(eq(products.id, productId));
  });

  const saved = await getMyReview(userId, productId);
  if (!saved) throw new Error("Review vanished right after saving.");
  return saved;
}

/** Toggles the caller's "helpful" vote. Voting on your own review is refused. */
export async function toggleHelpful(userId: string, reviewId: string): Promise<{ helpfulCount: number; votedHelpful: boolean }> {
  const [review] = await db.select({ userId: reviews.userId }).from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (!review) throw new NotFoundError("Review not found.");
  if (review.userId === userId) throw new ConflictError("You can't vote on your own review.");

  const removed = await db
    .delete(reviewVotes)
    .where(and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.userId, userId)))
    .returning({ reviewId: reviewVotes.reviewId });
  if (removed.length === 0) await db.insert(reviewVotes).values({ reviewId, userId }).onConflictDoNothing();

  const [{ n }] = await db.select({ n: count() }).from(reviewVotes).where(eq(reviewVotes.reviewId, reviewId));
  return { helpfulCount: n, votedHelpful: removed.length === 0 };
}
