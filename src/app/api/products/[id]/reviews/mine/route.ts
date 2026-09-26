import { NextResponse } from "next/server";
import { z } from "zod";
import { REVIEW_BODY_MAX, REVIEW_MAX_IMAGES, REVIEW_TITLE_MAX } from "@/domain/reviews";
import { parseBody, withUser } from "@/server/http";
import { getMyReview, upsertReview } from "@/server/reviewService";

type Ctx = RouteContext<"/api/products/[id]/reviews/mine">;

export function GET(_request: Request, { params }: Ctx) {
  return withUser(async (user) => NextResponse.json(await getMyReview(user.id, (await params).id)));
}

// PUT = create or replace: one review per user per product.
const body = z.object({
  rating: z.number().int(),
  title: z.string().max(REVIEW_TITLE_MAX * 2).default(""),
  body: z.string().max(REVIEW_BODY_MAX * 2),
  imageIds: z.array(z.string().max(64)).max(REVIEW_MAX_IMAGES * 2).default([]),
});

export function PUT(request: Request, { params }: Ctx) {
  return withUser(async (user) => {
    const { id } = await params;
    return NextResponse.json(await upsertReview(user.id, id, await parseBody(request, body)));
  });
}
