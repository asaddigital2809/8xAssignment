import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withUser } from "@/server/http";
import { createReturn, returnOptions } from "@/server/returnService";

type Ctx = RouteContext<"/api/orders/[id]/returns">;

/** What can still be returned from this order (and whether returns are open). */
export function GET(_request: Request, { params }: Ctx) {
  return withUser(async (user) => NextResponse.json(await returnOptions(user.id, (await params).id)));
}

// Items + quantities + reason only. Eligibility, remaining quantities and the refund
// amount are all determined server-side.
const body = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(0).max(100) })).min(1).max(50),
  reason: z.enum(["damaged", "wrong_item", "not_as_described", "no_longer_needed", "other"]),
  comment: z.string().max(500).optional(),
});

export function POST(request: Request, { params }: Ctx) {
  return withUser(async (user) => {
    const { id } = await params;
    return NextResponse.json(await createReturn(user.id, id, await parseBody(request, body)), { status: 201 });
  });
}
