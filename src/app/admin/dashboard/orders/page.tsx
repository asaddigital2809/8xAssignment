import { parseOrderStatus } from "@/domain/checkout";
import { requireAdmin } from "@/server/dal";
import { OrdersAdmin } from "./OrdersAdmin";

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/dashboard/orders">) {
  await requireAdmin();
  const { status, q } = await searchParams;
  return (
    <OrdersAdmin
      status={parseOrderStatus(typeof status === "string" ? status : undefined) ?? undefined}
      q={typeof q === "string" ? q.slice(0, 100) : ""}
    />
  );
}
