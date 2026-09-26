import { NextResponse } from "next/server";
import { deleteCategory, updateCategory } from "@/server/admin/adminCatalog";
import { categoryBody } from "@/server/admin/schemas";
import { parseBody, withAdmin } from "@/server/http";

type Ctx = RouteContext<"/api/admin/categories/[id]">;

export function PUT(request: Request, { params }: Ctx) {
  return withAdmin(async () => {
    const { id } = await params;
    return NextResponse.json(await updateCategory(id, await parseBody(request, categoryBody)));
  });
}

/** 409 while the category still has products. */
export function DELETE(_request: Request, { params }: Ctx) {
  return withAdmin(async () => {
    await deleteCategory((await params).id);
    return NextResponse.json({ ok: true });
  });
}
