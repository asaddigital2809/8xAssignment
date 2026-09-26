import { NextResponse, type NextRequest } from "next/server";
import { listFeatured, searchProducts } from "@/server/catalog";
import { handle } from "@/server/http";

export function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    if (params.get("featured") === "1") {
      return NextResponse.json(await listFeatured());
    }
    return NextResponse.json(
      await searchProducts({
        text: params.get("q") ?? undefined,
        categoryId: params.get("category") ?? undefined,
      }),
    );
  });
}
