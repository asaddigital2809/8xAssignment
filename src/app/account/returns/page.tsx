import { requireUser } from "@/server/dal";
import { ReturnsView } from "./ReturnsView";

export default async function ReturnsPage() {
  await requireUser("/account/returns");
  return <ReturnsView />;
}
