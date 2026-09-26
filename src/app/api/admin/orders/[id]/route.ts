import { NextResponse } from "next/server";
import { getAdminOrder, updateOrderStatus } from "@/server/admin/adminOrders";
import { orderStatusBody } from "@/server/admin/schemas";
import { parseBody, withAdmin } from "@/server/http";

type Ctx = RouteContext<"/api/admin/orders/[id]">;

export function GET(_request: Request, { params }: Ctx) {
  return withAdmin(async () => NextResponse.json(await getAdminOrder((await params).id)));
}

/** Status change; only transitions allowed by ORDER_TRANSITIONS succeed (409 otherwise). */
export function PATCH(request: Request, { params }: Ctx) {
  return withAdmin(async () => {
    const { id } = await params;
    const { status } = await parseBody(request, orderStatusBody);
    return NextResponse.json(await updateOrderStatus(id, status));
  });
}
