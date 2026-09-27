"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ProductImage } from "@/components/ProductImage";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { formatPrice } from "@/domain/money";
import { useAdminProducts } from "@/state/admin";

export function ProductsAdmin({ q }: { q: string }) {
  const router = useRouter();
  const { state, retry } = useAdminProducts(q);

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(query ? `/admin/dashboard/products?q=${encodeURIComponent(query)}` : "/admin/dashboard/products");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex gap-3">
          <form onSubmit={onSearch} role="search" className="flex">
            <input name="q" defaultValue={q} placeholder="Title, brand or id" aria-label="Search products" className="rounded-l border border-gray-300 px-3 py-1.5 text-sm" />
            <button className="rounded-r bg-slate-900 px-3 text-sm text-white">Search</button>
          </form>
          <Link href="/admin/dashboard/products/new" className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium hover:bg-amber-500">
            New product
          </Link>
        </div>
      </div>

      {state.status === "loading" && <Spinner label="Loading products…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && <EmptyView title="No products found" action={{ href: "/admin/dashboard/products", label: "Clear search" }} />}
      {state.status === "success" && state.data.length > 0 && (
        <div className="overflow-x-auto rounded bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.data.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${p.archived ? "text-gray-400" : ""}`}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/dashboard/products/${p.id}`} className="flex items-center gap-3">
                      <span className="relative h-10 w-10 shrink-0 bg-gray-50">
                        <ProductImage src={p.thumbnail} alt="" fill sizes="40px" className="object-contain" />
                      </span>
                      <span className="text-blue-700 hover:underline">{p.title}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2">{p.categoryId}</td>
                  <td className="px-3 py-2">{formatPrice(p.priceCents)}</td>
                  <td className={`px-3 py-2 ${p.stock < 5 && !p.archived ? "font-medium text-amber-700" : ""}`}>{p.stock}</td>
                  <td className="px-3 py-2">{p.archived ? "Archived" : "Live"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
