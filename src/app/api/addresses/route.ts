import { NextResponse } from "next/server";
import { z } from "zod";
import { createAddress, listAddresses } from "@/server/addressService";
import { parseBody, withUser } from "@/server/http";
import { addressBody } from "@/server/schemas";

export function GET() {
  return withUser(async (user) => NextResponse.json(await listAddresses(user.id)));
}

export function POST(request: Request) {
  return withUser(async (user) => {
    const { makeDefault, ...address } = await parseBody(request, addressBody.extend({ makeDefault: z.boolean().optional() }));
    return NextResponse.json(await createAddress(user.id, address, makeDefault), { status: 201 });
  });
}
