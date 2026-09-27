import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/server/dal";
import { ChevronDown } from "./icons";
import { SessionDataLoader } from "./SessionDataLoader";

const MENU_LINKS = [
  { href: "/account", label: "Your account" },
  { href: "/orders", label: "Your orders" },
  { href: "/account/wishlist", label: "Your wish list" },
  { href: "/account/returns", label: "Returns" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/payments", label: "Payment methods" },
];

/** Server-rendered account area of the header. The menu opens on hover or keyboard focus (CSS only). */
export async function AccountNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <SessionDataLoader userId={null} />
        <Link href="/signin" className="rounded px-2 py-1 leading-tight hover:ring-1 hover:ring-white">
          <span className="block text-xs text-gray-300">Hello, sign in</span>
          <span className="block text-sm font-bold">Account &amp; Lists</span>
        </Link>
      </>
    );
  }

  const firstName = user.name?.split(" ")[0] ?? "account";
  return (
    <>
      <SessionDataLoader userId={user.id} />
      <div className="group relative">
        <Link href="/account" aria-haspopup="true" className="block rounded px-2 py-1 leading-tight hover:ring-1 hover:ring-white">
          <span className="block text-xs text-gray-300">Hello, {firstName}</span>
          <span className="flex items-center gap-1 text-sm font-bold">
            Account &amp; Lists <ChevronDown />
          </span>
        </Link>
        <div className="invisible absolute right-0 z-30 w-56 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
          <div className="rounded-md bg-white p-3 text-sm text-gray-900 shadow-lg ring-1 ring-black/10">
            <ul className="space-y-1.5">
              {MENU_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-amber-700 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
              {user.role === "admin" && (
                <li className="border-t pt-1.5">
                  <Link href="/admin/dashboard" className="font-medium hover:text-amber-700 hover:underline">
                    Admin dashboard
                  </Link>
                </li>
              )}
            </ul>
            <form action={signOutAction} className="mt-2 border-t pt-2">
              <button className="text-left hover:text-amber-700 hover:underline">Sign out</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
