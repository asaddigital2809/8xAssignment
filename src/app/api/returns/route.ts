import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { listReturns } from "@/server/returnService";

export function GET() {
  return withUser(async (user) => NextResponse.json(await listReturns(user.id)));
}
