import { requireUser } from "@/server/dal";
import { OrderDetail } from "./OrderDetail";

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  await requireUser(`/orders/${id}`);
  const { placed } = await searchParams;
  return <OrderDetail id={id} justPlaced={placed === "1"} />;
}
