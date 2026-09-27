import { requireAdmin } from "@/server/dal";
import { Overview } from "./Overview";

export default async function AdminDashboardPage() {
  await requireAdmin();
  return <Overview />;
}
