import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { removeFromWishlist } from "@/server/wishlistService";

export function DELETE(_request: Request, { params }: RouteContext<"/api/wishlist/[productId]">) {
  return withUser(async (user) => NextResponse.json(await removeFromWishlist(user.id, (await params).productId)));
}
