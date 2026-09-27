import Link from "next/link";

const COLUMNS = [
  {
    title: "Get to know us",
    links: [
      { href: "/", label: "Home" },
      { href: "/search", label: "All products" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/account", label: "Your account" },
      { href: "/orders", label: "Your orders" },
      { href: "/account/wishlist", label: "Your wish list" },
    ],
  },
  {
    title: "Let us help you",
    links: [
      { href: "/account/returns", label: "Returns & replacements" },
      { href: "/account/addresses", label: "Manage addresses" },
      { href: "/account/payments", label: "Payment methods" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-10 text-sm text-white">
      <a href="#top" className="block bg-navy-light py-3.5 text-center hover:bg-[#37475a]">
        Back to top
      </a>
      <div className="bg-[#232f3e]">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 sm:grid-cols-3">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="mb-2 font-bold">{c.title}</p>
              <ul className="space-y-1.5 text-gray-300">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-navy py-6 text-center text-xs text-gray-400">
        <p className="mb-1 text-lg font-bold tracking-tight text-white">
          amzn<span className="text-brand">.clone</span>
        </p>
        A demo store for a take-home assignment. Not affiliated with Amazon. Payments are simulated.
      </div>
    </footer>
  );
}
