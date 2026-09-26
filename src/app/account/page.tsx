import Link from "next/link";
import { requireUser } from "@/server/dal";

/** Profile. Addresses, payment methods, password, returns etc. are added in later steps. */
export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Your account</h1>
      <section className="rounded bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-medium">Profile</h2>
        <dl className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd>{user.name ?? "—"}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd>{user.email}</dd>
        </dl>
      </section>
      <Link href="/orders" className="inline-block text-sm text-blue-700 hover:underline">
        Your orders
      </Link>
    </div>
  );
}
