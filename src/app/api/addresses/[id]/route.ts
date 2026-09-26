import { NextResponse } from "next/server";
import { deleteAddress, getAddress, updateAddress } from "@/server/addressService";
import { parseBody, withUser } from "@/server/http";
import { addressBody } from "@/server/schemas";

type Ctx = RouteContext<"/api/addresses/[id]">;

export function GET(_request: Request, { params }: Ctx) {
  return withUser(async (user) => NextResponse.json(await getAddress(user.id, (await params).id)));
}

export function PATCH(request: Request, { params }: Ctx) {
  return withUser(async (user) => {
    const { id } = await params;
    return NextResponse.json(await updateAddress(user.id, id, await parseBody(request, addressBody)));
  });
}

export function DELETE(_request: Request, { params }: Ctx) {
  return withUser(async (user) => NextResponse.json(await deleteAddress(user.id, (await params).id)));
}
