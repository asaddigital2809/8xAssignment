import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/dal";
import { handle } from "@/server/http";
import { listReviews } from "@/server/reviewService";

/** Public list; when signed in, each review also says whether the viewer voted / wrote it. */
export function GET(request: NextRequest, { params }: RouteContext<"/api/products/[id]/reviews">) {
  return handle(async () => {
    const { id } = await params;
    const sort = request.nextUrl.searchParams.get("sort") === "helpful" ? "helpful" : "recent";
    const viewer = await getCurrentUser();
    return NextResponse.json(await listReviews(id, viewer?.id ?? null, sort));
  });
}
