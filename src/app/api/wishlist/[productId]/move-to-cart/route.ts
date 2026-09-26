import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { moveToCart } from "@/server/wishlistService";

export function POST(_request: Request, { params }: RouteContext<"/api/wishlist/[productId]/move-to-cart">) {
  return withUser(async (user) => NextResponse.json(await moveToCart(user.id, (await params).productId)));
}
