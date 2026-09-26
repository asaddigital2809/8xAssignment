import { NextResponse } from "next/server";
import { z } from "zod";
import { quote } from "@/server/couponService";
import { parseBody, withUser } from "@/server/http";

/** Price breakdown for the review step, computed from the server cart (and coupon, if any). */
export function POST(request: Request) {
  return withUser(async (user) => {
    const { couponCode } = await parseBody(request, z.object({ couponCode: z.string().max(64).optional() }));
    return NextResponse.json(await quote(user.id, couponCode));
  });
}
