import Link from "next/link";
import { requireUser } from "@/server/dal";

const SECTIONS = [
  { href: "/orders", title: "Your orders", body: "Track orders and filter by status" },
  { href: "/account/returns", title: "Returns", body: "Return requests and their status" },
  { href: "/account/addresses", title: "Addresses", body: "Shipping addresses and your default" },
  { href: "/account/payments", title: "Payment methods", body: "Saved cards and your default" },
  { href: "/account/security", title: "Password & security", body: "Change your password" },
];

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div className="space-y-4">
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
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="rounded bg-white p-4 shadow-sm hover:shadow">
            <p className="font-medium">{s.title}</p>
            <p className="text-sm text-gray-600">{s.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
