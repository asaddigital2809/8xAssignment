import { requireAdmin } from "@/server/dal";
import { CouponsAdmin } from "./CouponsAdmin";

export default async function AdminCouponsPage() {
  await requireAdmin();
  return <CouponsAdmin />;
}
