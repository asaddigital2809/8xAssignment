import { NextResponse } from "next/server";
import { getCart } from "@/server/cartService";
import { withUser } from "@/server/http";

export function GET() {
  return withUser(async (user) => NextResponse.json(await getCart(user.id)));
}
