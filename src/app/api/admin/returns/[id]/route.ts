import { NextResponse } from "next/server";
import { updateReturnStatus } from "@/server/admin/adminOrders";
import { returnStatusBody } from "@/server/admin/schemas";
import { parseBody, withAdmin } from "@/server/http";

export function PATCH(request: Request, { params }: RouteContext<"/api/admin/returns/[id]">) {
  return withAdmin(async () => {
    const { id } = await params;
    const { status } = await parseBody(request, returnStatusBody);
    return NextResponse.json(await updateReturnStatus(id, status));
  });
}
