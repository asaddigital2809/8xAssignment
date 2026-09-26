import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { setDefaultPaymentMethod } from "@/server/paymentMethodService";

export function POST(_request: Request, { params }: RouteContext<"/api/payment-methods/[id]/default">) {
  return withUser(async (user) => NextResponse.json(await setDefaultPaymentMethod(user.id, (await params).id)));
}
