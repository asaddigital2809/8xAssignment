"use client";

import Link from "next/link";
import { OrderSummary } from "@/components/OrderSummary";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/domain/checkout";
import type { OrderStatus } from "@/domain/types";
import { useOrders } from "@/state/orders";

export function OrdersView({ status }: { status?: OrderStatus }) {
  const { state, retry } = useOrders(status);

  return (
    <div>
      <h1 className="mb-3 text-2xl font-semibold">Your Orders</h1>
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        <FilterLink label="All" active={!status} href="/orders" />
        {ORDER_STATUSES.map((s) => (
          <FilterLink key={s} label={ORDER_STATUS_LABEL[s]} active={status === s} href={`/orders?status=${s}`} />
        ))}
      </nav>
      {state.status === "loading" && <Spinner label="Loading orders…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && (
        status ? (
          <EmptyView title={`No ${ORDER_STATUS_LABEL[status].toLowerCase()} orders`} action={{ href: "/orders", label: "Show all orders" }} />
        ) : (
          <EmptyView title="You haven't placed any orders yet" action={{ href: "/", label: "Start shopping" }} />
        )
      )}
      {state.status === "success" && state.data.length > 0 && (
        <div className="space-y-4">
          {state.data.map((order) => (
            <OrderSummary key={order.id} order={order} />
          ))}
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
