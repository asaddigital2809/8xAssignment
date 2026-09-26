import { NextResponse } from "next/server";
import { listCategories } from "@/server/catalog";

export function GET() {
  return NextResponse.json(listCategories());
}
