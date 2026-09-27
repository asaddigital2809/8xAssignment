import { requireAdmin } from "@/server/dal";
import { CategoriesAdmin } from "./CategoriesAdmin";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  return <CategoriesAdmin />;
}
