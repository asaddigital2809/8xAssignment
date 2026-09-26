import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseOrderStatus } from "@/domain/checkout";
import { BadRequestError } from "@/server/errors";
import { parseBody, withUser } from "@/server/http";
import { createOrder, listOrders } from "@/server/orderService";

/** The caller's orders, optionally filtered by ?status= (validated against the real statuses). */
export function GET(request: NextRequest) {
  return withUser(async (user) => {
    const status = parseOrderStatus(request.nextUrl.searchParams.get("status"));
    if (status === null) throw new BadRequestError("Unknown order status.");
    return NextResponse.json(await listOrders(user.id, status));
  });
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
