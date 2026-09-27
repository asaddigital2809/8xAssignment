import { requireAdmin } from "@/server/dal";
import { ProductEditor } from "../ProductEditor";

export default async function NewProductPage() {
  await requireAdmin();
  return <ProductEditor />;
}
