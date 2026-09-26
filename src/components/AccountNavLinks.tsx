"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/orders", label: "Your orders" },
  { href: "/account/returns", label: "Returns" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/payments", label: "Payment methods" },
  { href: "/account/security", label: "Password & security" },
];

export function AccountNavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded px-3 py-2 text-sm ${active ? "bg-white font-medium shadow-sm" : "text-gray-700 hover:bg-white/60"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
