import { NextResponse } from "next/server";
import { z } from "zod";
import { removeItem, setItemQuantity } from "@/server/cartService";
import { parseBody, withUser } from "@/server/http";

type Ctx = RouteContext<"/api/cart/items/[productId]">;

const body = z.object({ quantity: z.number().int().min(0).max(100) });

export function PATCH(request: Request, { params }: Ctx) {
  return withUser(async (user) => {
    const { productId } = await params;
    const { quantity } = await parseBody(request, body);
    return NextResponse.json(await setItemQuantity(user.id, productId, quantity));
  });
}

export function DELETE(_request: Request, { params }: Ctx) {
  return withUser(async (user) => {
    const { productId } = await params;
    return NextResponse.json(await removeItem(user.id, productId));
  });
}
