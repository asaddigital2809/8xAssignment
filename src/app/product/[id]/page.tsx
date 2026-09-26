import { ProductDetail } from "./ProductDetail";

export default async function ProductPage({ params }: PageProps<"/product/[id]">) {
  const { id } = await params;
  return <ProductDetail id={id} />;
}
