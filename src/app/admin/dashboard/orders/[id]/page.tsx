import { requireAdmin } from "@/server/dal";
import { OrderAdmin } from "./OrderAdmin";

export default async function AdminOrderPage({ params }: PageProps<"/admin/dashboard/orders/[id]">) {
  await requireAdmin();
  return <OrderAdmin id={(await params).id} />;
}
