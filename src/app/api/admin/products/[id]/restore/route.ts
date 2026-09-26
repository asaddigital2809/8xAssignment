import { NextResponse } from "next/server";
import { setProductArchived } from "@/server/admin/adminCatalog";
import { withAdmin } from "@/server/http";

/** Un-archive a product so it's visible and purchasable again. */
export function POST(_request: Request, { params }: RouteContext<"/api/admin/products/[id]/restore">) {
  return withAdmin(async () => NextResponse.json(await setProductArchived((await params).id, false)));
}
