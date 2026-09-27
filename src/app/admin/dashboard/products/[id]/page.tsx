import { Notice } from "@/components/forms";
import { requireAdmin } from "@/server/dal";
import { ProductEditor } from "../ProductEditor";

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/dashboard/products/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  return (
    <div className="space-y-3">
      {created && <Notice>Product created. It&apos;s live in the store.</Notice>}
      <ProductEditor id={id} />
    </div>
  );
}
