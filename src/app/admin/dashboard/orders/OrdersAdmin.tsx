"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatOrderDate } from "@/components/OrderSummary";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/domain/checkout";
import { formatPrice } from "@/domain/money";
import type { OrderStatus } from "@/domain/types";
import { useAdminOrders } from "@/state/admin";

export function OrdersAdmin({ status, q }: { status?: OrderStatus; q: string }) {
  const router = useRouter();
  const { state, retry } = useAdminOrders(status, q);

  const href = (s?: OrderStatus, query = q) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (query) params.set("q", query);
    return `/admin/dashboard/orders${params.size ? `?${params}` : ""}`;
  };

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(href(status, String(new FormData(e.currentTarget).get("q") ?? "").trim()));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          <FilterLink label="All" href={href()} active={!status} />
          {ORDER_STATUSES.map((s) => (
            <FilterLink key={s} label={ORDER_STATUS_LABEL[s]} href={href(s)} active={status === s} />
          ))}
        </nav>
        <form onSubmit={onSearch} role="search" className="flex">
          <input
            name="q"
            defaultValue={q}
            placeholder="Order # or customer"
            aria-label="Search orders"
            className="rounded-l border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button className="rounded-r bg-slate-900 px-3 text-sm text-white">Search</button>
        </form>
      </div>

      {state.status === "loading" && <Spinner label="Loading orders…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && <EmptyView title="No matching orders" action={{ href: "/admin/dashboard/orders", label: "Clear filters" }} />}
      {state.status === "success" && state.data.length > 0 && (
        <div className="overflow-x-auto rounded bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Placed</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Items</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.data.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link href={`/admin/dashboard/orders/${o.id}`} className="text-blue-700 hover:underline">
                      {o.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatOrderDate(o.placedAt)}</td>
                  <td className="px-3 py-2">
                    <div>{o.customer.name ?? "—"}</div>
                    <div className="text-xs text-gray-500">{o.customer.email}</div>
                  </td>
                  <td className="px-3 py-2">{o.itemCount}</td>
                  <td className="px-3 py-2">{formatPrice(o.totalCents)}</td>
                  <td className="px-3 py-2">
                    <OrderStatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1 text-sm ${active ? "bg-slate-900 text-white" : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"}`}
    >
      {label}
    </Link>
  );
}
