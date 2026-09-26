import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { getReturn } from "@/server/returnService";

export function GET(_request: Request, { params }: RouteContext<"/api/returns/[id]">) {
  return withUser(async (user) => NextResponse.json(await getReturn(user.id, (await params).id)));
}
