import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { payOrder } from "@/server/orderService";

/** Mock payment. Succeeds at most once per order; repeats get 409, others' orders 404. */
export function POST(_request: Request, { params }: RouteContext<"/api/orders/[id]/pay">) {
  return withUser(async (user) => {
    const { id } = await params;
    return NextResponse.json(await payOrder(user.id, id));
  });
}
