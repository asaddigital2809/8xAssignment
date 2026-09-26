import { NextResponse } from "next/server";
import { z } from "zod";
import { addItem } from "@/server/cartService";
import { parseBody, withUser } from "@/server/http";

// Only intent is accepted: which product and how many. Any price/title in the body is ignored.
const body = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(100),
});

export function POST(request: Request) {
  return withUser(async (user) => {
    const { productId, quantity } = await parseBody(request, body);
    return NextResponse.json(await addItem(user.id, productId, quantity));
  });
}
