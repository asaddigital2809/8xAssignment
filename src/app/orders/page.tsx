import { parseOrderStatus } from "@/domain/checkout";
import { requireUser } from "@/server/dal";
import { OrdersView } from "./OrdersView";

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  await requireUser("/orders");
  const { status } = await searchParams;
  // An unknown status in the URL just shows all orders.
  const filter = parseOrderStatus(typeof status === "string" ? status : undefined) ?? undefined;
  return <OrdersView status={filter} />;
}
