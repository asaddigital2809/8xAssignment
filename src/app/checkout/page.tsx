import { requireUser } from "@/server/dal";
import { CheckoutView } from "./CheckoutView";

export default async function CheckoutPage() {
  await requireUser("/checkout");
  return <CheckoutView />;
}
