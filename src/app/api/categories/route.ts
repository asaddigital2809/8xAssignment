import { NextResponse } from "next/server";
import { listCategories } from "@/server/catalog";
import { handle } from "@/server/http";

export function GET() {
  return handle(async () => NextResponse.json(await listCategories()));
}
