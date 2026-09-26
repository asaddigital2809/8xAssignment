import { NextResponse, type NextRequest } from "next/server";
import { listFeatured, searchProducts } from "@/server/catalog";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("featured") === "1") {
    return NextResponse.json(listFeatured());
  }
  return NextResponse.json(
    searchProducts({
      text: params.get("q") ?? undefined,
      categoryId: params.get("category") ?? undefined,
    }),
  );
}
