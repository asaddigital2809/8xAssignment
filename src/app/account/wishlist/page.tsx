import { requireUser } from "@/server/dal";
import { WishlistView } from "./WishlistView";

export default async function WishlistPage() {
  await requireUser("/account/wishlist");
  return <WishlistView />;
}
