import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { toggleHelpful } from "@/server/reviewService";

/** Toggles the caller's helpful vote (409 on your own review). */
export function POST(_request: Request, { params }: RouteContext<"/api/reviews/[id]/helpful">) {
  return withUser(async (user) => NextResponse.json(await toggleHelpful(user.id, (await params).id)));
}
