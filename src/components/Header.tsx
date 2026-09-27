"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCategories } from "@/state/catalogQueries";
import { useCartCount, useCartStatus } from "@/state/cartStore";
import { CartIcon, SearchIcon } from "./icons";

/** `account` is a server-rendered slot (sign-in state), passed in from the layout. */
export function Header({ account }: { account: ReactNode }) {
  const params = useSearchParams();
  return (
    <header>
      <div className="bg-navy text-white">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 md:flex-nowrap lg:px-6">
          <Link href="/" className="rounded px-1 py-1 text-2xl font-bold tracking-tight outline-offset-2 hover:ring-1 hover:ring-white">
            amzn<span className="text-brand">.clone</span>
          </Link>
          {/* Keyed on the query/category so the inputs reset when navigation changes the search. */}
          <SearchBar key={`${params.get("q") ?? ""}|${params.get("category") ?? ""}`} />
          <nav aria-label="Account" className="ml-auto flex items-center gap-1 md:ml-0">
            {account}
            <Link href="/orders" className="hidden rounded px-2 py-1 leading-tight hover:ring-1 hover:ring-white md:block">
              <span className="block text-xs text-gray-300">Returns</span>
              <span className="block text-sm font-bold">&amp; Orders</span>
            </Link>
            <CartLink />
          </nav>
        </div>
      </div>
      <CategoryBar />
    </header>
  );
}

function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const { state } = useCategories();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = String(form.get("q") ?? "").trim();
    const category = String(form.get("category") ?? "");
    const next = new URLSearchParams();
    if (text) next.set("q", text);
    if (category) next.set("category", category);
    router.push(`/search?${next}`);
  }

  return (
    // Uncontrolled (read from FormData on submit), and action/name make it a plain GET
    // form too, so searching works even before the page's JS has loaded.
    <form
      action="/search"
      onSubmit={onSubmit}
      role="search"
      className="order-last flex h-10 w-full overflow-hidden rounded-md focus-within:ring-3 focus-within:ring-brand md:order-none md:flex-1"
    >
      <select
        name="category"
        defaultValue={params.get("category") ?? ""}
        aria-label="Search in department"
        className="hidden max-w-40 border-r border-gray-300 bg-gray-100 px-2 text-xs text-gray-700 outline-none hover:bg-gray-200 sm:block"
      >
        <option value="">All</option>
        {state.status === "success" &&
          state.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <input
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder="Search amzn.clone"
        aria-label="Search products"
        className="min-w-0 flex-1 bg-white px-3 text-gray-900 outline-none"
      />
      <button type="submit" aria-label="Search" className="bg-brand px-3 text-gray-900 hover:bg-brand-dark">
        <SearchIcon />
      </button>
    </form>
  );
}

function CartLink() {
  const count = useCartCount();
  const status = useCartStatus();
  // The count is the link's only <span> (tests and the signed-out state rely on that).
  return (
    <Link href="/cart" aria-label={`Cart${status === "ready" ? `, ${count} items` : ""}`} className="flex items-end gap-1 rounded px-2 py-1 hover:ring-1 hover:ring-white">
      <div className="relative">
        <CartIcon width={34} height={34} />
        {status !== "signed-out" && (
          <span className="absolute top-[3px] left-[19px] -translate-x-1/2 text-sm leading-none font-bold text-brand">{status === "ready" ? count : "·"}</span>
        )}
      </div>
      <b className="hidden pb-0.5 text-sm sm:block">Cart</b>
    </Link>
  );
}

/** Department links; scrolls sideways on small screens. */
function CategoryBar() {
  const { state } = useCategories();
  const params = useSearchParams();
  const active = params.get("category");
  return (
    <nav aria-label="Departments" className="bg-navy-light text-sm text-white">
      <div className="flex gap-1 overflow-x-auto px-2 py-1.5 whitespace-nowrap lg:px-5">
        <Link href="/search" className="rounded px-2 py-0.5 font-bold hover:ring-1 hover:ring-white">
          All
        </Link>
        {state.status === "success" &&
          state.data.map((c) => (
            <Link
              key={c.id}
              href={`/search?category=${c.id}`}
              aria-current={active === c.id ? "page" : undefined}
              className="rounded px-2 py-0.5 hover:ring-1 hover:ring-white aria-[current=page]:ring-1 aria-[current=page]:ring-white"
            >
              {c.name}
            </Link>
          ))}
      </div>
    </nav>
  );
}
