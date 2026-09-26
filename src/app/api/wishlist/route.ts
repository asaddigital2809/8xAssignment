import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withUser } from "@/server/http";
import { addToWishlist, listWishlist } from "@/server/wishlistService";

export function GET() {
  return withUser(async (user) => NextResponse.json(await listWishlist(user.id)));
}

export function POST(request: Request) {
  return withUser(async (user) => {
    const { productId } = await parseBody(request, z.object({ productId: z.string().min(1).max(64) }));
    return NextResponse.json(await addToWishlist(user.id, productId));
  });
}
