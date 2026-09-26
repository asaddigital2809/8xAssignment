import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withUser } from "@/server/http";
import { addPaymentMethod, listPaymentMethods } from "@/server/paymentMethodService";

export function GET() {
  return withUser(async (user) => NextResponse.json(await listPaymentMethods(user.id)));
}

// Mock card entry. The number is validated and reduced to brand + last 4 server-side;
// it is never stored or echoed back. No CVC is accepted.
const body = z.object({
  number: z.string().max(30),
  expMonth: z.number().int(),
  expYear: z.number().int(),
  holderName: z.string().max(100),
  makeDefault: z.boolean().optional(),
});

export function POST(request: Request) {
  return withUser(async (user) => {
    const { makeDefault, ...card } = await parseBody(request, body);
    return NextResponse.json(await addPaymentMethod(user.id, card, makeDefault), { status: 201 });
  });
}
