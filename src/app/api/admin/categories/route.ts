import { NextResponse } from "next/server";
import { createCategory, listAdminCategories } from "@/server/admin/adminCatalog";
import { categoryBody } from "@/server/admin/schemas";
import { parseBody, withAdmin } from "@/server/http";

export function GET() {
  return withAdmin(async () => NextResponse.json(await listAdminCategories()));
}

export function POST(request: Request) {
  return withAdmin(async () => NextResponse.json(await createCategory(await parseBody(request, categoryBody)), { status: 201 }));
}
