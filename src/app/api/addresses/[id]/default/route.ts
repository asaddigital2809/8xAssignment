import { NextResponse } from "next/server";
import { setDefaultAddress } from "@/server/addressService";
import { withUser } from "@/server/http";

export function POST(_request: Request, { params }: RouteContext<"/api/addresses/[id]/default">) {
  return withUser(async (user) => NextResponse.json(await setDefaultAddress(user.id, (await params).id)));
}
