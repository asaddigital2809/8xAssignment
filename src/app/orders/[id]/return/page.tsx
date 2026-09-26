import { requireUser } from "@/server/dal";
import { ReturnRequestForm } from "./ReturnRequestForm";

export default async function ReturnRequestPage({ params }: PageProps<"/orders/[id]/return">) {
  const { id } = await params;
  await requireUser(`/orders/${id}/return`);
  return <ReturnRequestForm orderId={id} />;
}
