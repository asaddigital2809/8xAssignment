import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { deletePaymentMethod } from "@/server/paymentMethodService";

export function DELETE(_request: Request, { params }: RouteContext<"/api/payment-methods/[id]">) {
  return withUser(async (user) => NextResponse.json(await deletePaymentMethod(user.id, (await params).id)));
}
