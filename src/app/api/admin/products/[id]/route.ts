import { NextResponse } from "next/server";
import { deleteProduct, getAdminProduct, updateProduct } from "@/server/admin/adminCatalog";
import { productBody } from "@/server/admin/schemas";
import { parseBody, withAdmin } from "@/server/http";

type Ctx = RouteContext<"/api/admin/products/[id]">;

export function GET(_request: Request, { params }: Ctx) {
  return withAdmin(async () => NextResponse.json(await getAdminProduct((await params).id)));
}

export function PUT(request: Request, { params }: Ctx) {
  return withAdmin(async () => {
    const { id } = await params;
    return NextResponse.json(await updateProduct(id, await parseBody(request, productBody)));
  });
}

/** Deletes, or archives if the product has ever been ordered ({ result: "deleted" | "archived" }). */
export function DELETE(_request: Request, { params }: Ctx) {
  return withAdmin(async () => NextResponse.json(await deleteProduct((await params).id)));
}
