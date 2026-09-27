"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/dashboard", label: "Overview", exact: true },
  { href: "/admin/dashboard/orders", label: "Orders" },
  { href: "/admin/dashboard/products", label: "Products" },
  { href: "/admin/dashboard/categories", label: "Categories" },
  { href: "/admin/dashboard/coupons", label: "Coupons" },
];

export function AdminNavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded px-3 py-2 text-sm ${active ? "bg-slate-900 font-medium text-white" : "text-gray-700 hover:bg-white"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
