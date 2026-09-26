import { NextResponse, type NextRequest } from "next/server";
import { createProduct, listAdminProducts } from "@/server/admin/adminCatalog";
import { productBody } from "@/server/admin/schemas";
import { parseBody, withAdmin } from "@/server/http";

export function GET(request: NextRequest) {
  return withAdmin(async () => {
    const params = request.nextUrl.searchParams;
    return NextResponse.json(await listAdminProducts({ q: params.get("q") ?? undefined, categoryId: params.get("category") ?? undefined }));
  });
}

export function POST(request: Request) {
  return withAdmin(async () => NextResponse.json(await createProduct(await parseBody(request, productBody)), { status: 201 }));
}
