import { NextResponse } from "next/server";
import { createCoupon, listAdminCoupons } from "@/server/admin/adminCoupons";
import { couponBody } from "@/server/admin/schemas";
import { parseBody, withAdmin } from "@/server/http";

export function GET() {
  return withAdmin(async () => NextResponse.json(await listAdminCoupons()));
}

export function POST(request: Request) {
  return withAdmin(async () => NextResponse.json(await createCoupon(await parseBody(request, couponBody)), { status: 201 }));
}
