import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { getOrder } from "@/server/orderService";

export function GET(_request: Request, { params }: RouteContext<"/api/orders/[id]">) {
  return withUser(async (user) => {
    const { id } = await params;
    return NextResponse.json(await getOrder(user.id, id));
  });
}
