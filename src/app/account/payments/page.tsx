import { requireUser } from "@/server/dal";
import { PaymentMethods } from "./PaymentMethods";

export default async function PaymentsPage() {
  await requireUser("/account/payments");
  return <PaymentMethods />;
}
