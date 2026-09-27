"use client";

import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { ErrorView, Spinner } from "@/components/StatusViews";
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/domain/checkout";
import { formatPrice } from "@/domain/money";
import { useAdminOverview } from "@/state/admin";

export function Overview() {
  const { state, retry } = useAdminOverview();
  if (state.status === "loading") return <Spinner label="Loading dashboard…" />;
  if (state.status === "error") return <ErrorView message={state.error.message} onRetry={retry} />;
  const o = state.data;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Revenue (paid orders)" value={formatPrice(o.revenueCents)} />
        <Tile label="Orders to ship" value={String(o.ordersByStatus.paid)} href="/admin/dashboard/orders?status=paid" />
        <Tile label="Open returns" value={String(o.openReturns)} href="/admin/dashboard/orders?status=delivered" />
      </div>

      <section className="rounded bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-medium">Orders by status</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {ORDER_STATUSES.map((s) => (
            <li key={s}>
              <Link href={`/admin/dashboard/orders?status=${s}`} className="flex items-center gap-2 rounded border px-3 py-1 hover:bg-gray-50">
                {ORDER_STATUS_LABEL[s]} <strong>{o.ordersByStatus[s]}</strong>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium">Recent orders</h2>
          {o.recentOrders.length === 0 ? (
            <p className="text-sm text-gray-600">No orders yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {o.recentOrders.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/dashboard/orders/${r.id}`} className="text-blue-700 hover:underline">
                    {r.id}
                  </Link>
                  <span className="truncate text-gray-600">{r.customer.email}</span>
                  <OrderStatusBadge status={r.status} />
                  <span>{formatPrice(r.totalCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium">Low stock</h2>
          {o.lowStock.length === 0 ? (
            <p className="text-sm text-gray-600">Everything is well stocked.</p>
          ) : (
            <ul className="divide-y text-sm">
              {o.lowStock.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <Link href={`/admin/dashboard/products/${p.id}`} className="text-blue-700 hover:underline">
                    {p.title}
                  </Link>
                  <span className={p.stock === 0 ? "font-medium text-red-700" : "text-amber-700"}>{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded bg-white p-4 shadow-sm hover:shadow">
      {body}
    </Link>
  ) : (
    <div className="rounded bg-white p-4 shadow-sm">{body}</div>
  );
}
