import { NextResponse } from "next/server";
import { getOverview } from "@/server/admin/adminOrders";
import { withAdmin } from "@/server/http";

export function GET() {
  return withAdmin(async () => NextResponse.json(await getOverview()));
}
