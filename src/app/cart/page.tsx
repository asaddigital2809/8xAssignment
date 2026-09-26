import { requireUser } from "@/server/dal";
import { CartView } from "./CartView";

export default async function CartPage() {
  await requireUser("/cart");
  return <CartView />;
}
