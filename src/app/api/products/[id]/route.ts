import { NextResponse } from "next/server";
import { getProduct } from "@/server/catalog";
import { handle, notFound } from "@/server/http";

export function GET(_request: Request, { params }: RouteContext<"/api/products/[id]">) {
  return handle(async () => {
    const { id } = await params;
    const product = await getProduct(id);
    return product ? NextResponse.json(product) : notFound("Product not found");
  });
}
