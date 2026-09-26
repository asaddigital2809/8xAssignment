import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withUser } from "@/server/http";
import { createOrder, listOrders } from "@/server/orderService";

export function GET() {
  return withUser(async (user) => NextResponse.json(await listOrders(user.id)));
}

// The body only *names* things: which saved address, which saved card, which coupon.
// Items and prices come from the server-side cart and catalog; the discount and totals
// are computed server-side. Unknown fields (e.g. totalCents) are stripped.
const body = z.object({
  idempotencyKey: z.uuid(),
  addressId: z.string().min(1).max(64),
  paymentMethodId: z.string().min(1).max(64),
  couponCode: z.string().max(64).optional(),
});

export function POST(request: Request) {
  return withUser(async (user) => {
    const { idempotencyKey, ...selection } = await parseBody(request, body);
    return NextResponse.json(await createOrder(user.id, selection, idempotencyKey), { status: 201 });
  });
}
