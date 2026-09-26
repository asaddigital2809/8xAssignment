import { NextResponse, type NextRequest } from "next/server";
import { parseOrderStatus } from "@/domain/checkout";
import { listAdminOrders } from "@/server/admin/adminOrders";
import { BadRequestError } from "@/server/errors";
import { withAdmin } from "@/server/http";

/** All customers' orders; ?status= (validated) and ?q= (order id / customer email or name). */
export function GET(request: NextRequest) {
  return withAdmin(async () => {
    const params = request.nextUrl.searchParams;
    const status = parseOrderStatus(params.get("status"));
    if (status === null) throw new BadRequestError("Unknown order status.");
    return NextResponse.json(await listAdminOrders({ status, q: params.get("q") ?? undefined }));
  });
}
