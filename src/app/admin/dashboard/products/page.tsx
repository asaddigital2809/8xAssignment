import { requireAdmin } from "@/server/dal";
import { ProductsAdmin } from "./ProductsAdmin";

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/dashboard/products">) {
  await requireAdmin();
  const { q } = await searchParams;
  return <ProductsAdmin q={typeof q === "string" ? q.slice(0, 100) : ""} />;
}
