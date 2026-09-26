import { requireUser } from "@/server/dal";
import { OrdersView } from "./OrdersView";

export default async function OrdersPage() {
  await requireUser("/orders");
  return <OrdersView />;
}
