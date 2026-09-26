"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCartCount, useCartHydrated } from "@/state/cartStore";

export function Header() {
  const params = useSearchParams();
  return (
    <header className="bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          amzn<span className="text-amber-400">.clone</span>
        </Link>
        {/* Keyed on the query so the input resets when navigation changes the search. */}
        <SearchBar key={params.get("q") ?? ""} />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/orders" className="hover:underline">
            Orders
          </Link>
          <CartLink />
        </nav>
      </div>
    </header>
  );
}

function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (text.trim()) next.set("q", text.trim());
    const category = params.get("category");
    if (category) next.set("category", category);
    router.push(`/search?${next}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="order-last flex w-full sm:order-none sm:flex-1">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search products"
        aria-label="Search products"
        className="min-w-0 flex-1 rounded-l bg-white px-3 py-2 text-gray-900 outline-none"
      />
      <button type="submit" className="rounded-r bg-amber-400 px-4 font-medium text-gray-900 hover:bg-amber-500">
        Search
      </button>
    </form>
  );
}

function CartLink() {
  const count = useCartCount();
  const hydrated = useCartHydrated();
  return (
    <Link href="/cart" className="flex items-center gap-1 font-medium hover:underline">
      Cart
      <span className="min-w-6 rounded-full bg-amber-400 px-1.5 text-center text-sm text-gray-900">{hydrated ? count : "·"}</span>
    </Link>
  );
}
