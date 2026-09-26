import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withUser } from "@/server/http";
import { createOrder, listOrders } from "@/server/orderService";

export function GET() {
  return withUser(async (user) => NextResponse.json(await listOrders(user.id)));
}

// The body carries the shipping address and an idempotency key only. Items and prices
// come from the user's server-side cart and the catalog; totals are computed server-side.
const body = z.object({
  idempotencyKey: z.uuid(),
  address: z.object({
    fullName: z.string().max(100),
    line1: z.string().max(200),
    city: z.string().max(100),
    postalCode: z.string().max(20),
    country: z.string().max(100),
  }),
});

export function POST(request: Request) {
  return withUser(async (user) => {
    const { address, idempotencyKey } = await parseBody(request, body);
    return NextResponse.json(await createOrder(user.id, address, idempotencyKey), { status: 201 });
  });
}
