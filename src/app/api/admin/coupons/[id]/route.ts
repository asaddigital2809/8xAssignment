import { NextResponse } from "next/server";
import { deleteCoupon, updateCoupon } from "@/server/admin/adminCoupons";
import { couponBody } from "@/server/admin/schemas";
import { parseBody, withAdmin } from "@/server/http";

type Ctx = RouteContext<"/api/admin/coupons/[id]">;

export function PUT(request: Request, { params }: Ctx) {
  return withAdmin(async () => {
    const { id } = await params;
    return NextResponse.json(await updateCoupon(id, await parseBody(request, couponBody)));
  });
}

/** 409 if the coupon has been used (deactivate it instead). */
export function DELETE(_request: Request, { params }: Ctx) {
  return withAdmin(async () => {
    await deleteCoupon((await params).id);
    return NextResponse.json({ ok: true });
  });
}
