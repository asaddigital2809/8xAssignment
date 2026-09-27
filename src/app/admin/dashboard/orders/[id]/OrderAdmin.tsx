"use client";

import Link from "next/link";
import { useState } from "react";
import { OrderSummary } from "@/components/OrderSummary";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { adminRepository as repo } from "@/data/adminRepository";
import { NotFoundError } from "@/data/http";
import { ORDER_TRANSITIONS, RETURN_TRANSITIONS, type AdminOrderDetail } from "@/domain/admin";
import { ORDER_STATUS_LABEL } from "@/domain/checkout";
import { formatPrice } from "@/domain/money";
import { RETURN_REASONS, RETURN_STATUS_LABEL, type ReturnStatus } from "@/domain/returns";
import type { OrderStatus } from "@/domain/types";
import { useAdminOrder } from "@/state/admin";
import { attempt } from "@/state/mutation";

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

const RETURN_ACTION: Record<ReturnStatus, string> = { approved: "Approve", rejected: "Reject", refunded: "Mark refunded", requested: "" };

export function OrderAdmin({ id }: { id: string }) {
  const { state, retry, replace } = useAdminOrder(id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(call: () => Promise<AdminOrderDetail>) {
    setBusy(true);
    const result = await attempt(call);
    setBusy(false);
    if (result.ok) {
      replace(result.data);
      setError(undefined);
    } else setError(result.error);
  }

  if (state.status === "loading") return <Spinner label="Loading order…" />;
  if (state.status === "error") {
    if (state.error instanceof NotFoundError) return <EmptyView title="Order not found" action={{ href: "/admin/dashboard/orders", label: "All orders" }} />;
    return <ErrorView message={state.error.message} onRetry={retry} />;
  }
  const order = state.data;
  const next = ORDER_TRANSITIONS[order.status];

  return (
    <div className="space-y-4">
      <Link href="/admin/dashboard/orders" className="text-sm text-link hover:underline">
        ← All orders
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          {order.id} <OrderStatusBadge status={order.status} />
        </h1>
        <div className="flex flex-wrap gap-2">
          {next.length === 0 && <span className="text-sm text-gray-500">No further status changes.</span>}
          {next.map((to) => (
            <button
              key={to}
              disabled={busy}
              onClick={() => {
                if (to === "cancelled" && !window.confirm("Cancel this order? Paid items go back into stock.")) return;
                void run(() => repo.setOrderStatus(order.id, to));
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50 ${to === "cancelled" ? "border border-red-300 text-red-700 hover:bg-red-50" : "bg-cta hover:bg-cta-dark"}`}
            >
              {ACTION_LABEL[to] ?? ORDER_STATUS_LABEL[to]}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <section className="rounded bg-white p-4 text-sm shadow-sm">
        <p className="font-medium">Customer</p>
        <p>
          {order.customer.name ?? "—"} · {order.customer.email}
        </p>
        {order.deliveredAt && <p className="mt-1 text-gray-600">Delivered {new Date(order.deliveredAt).toLocaleString()}</p>}
      </section>

      <OrderSummary order={order} showAddress linkBase="/admin/dashboard/orders" />

      <section className="rounded bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-medium">Returns</h2>
        {order.returns.length === 0 ? (
          <p className="text-sm text-gray-600">No return requests for this order.</p>
        ) : (
          <ul className="divide-y text-sm">
            {order.returns.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p>
                    <strong>{r.id}</strong> · {RETURN_STATUS_LABEL[r.status]} · refund {formatPrice(r.refundCents)}
                  </p>
                  <p className="text-gray-600">
                    {r.items.map((i) => `${i.quantity} × ${i.title}`).join(", ")} · {RETURN_REASONS[r.reason]}
                    {r.comment && `: “${r.comment}”`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {RETURN_TRANSITIONS[r.status].map((to) => (
                    <button
                      key={to}
                      disabled={busy}
                      onClick={() => void run(() => repo.setReturnStatus(r.id, to))}
                      className="rounded-full border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {RETURN_ACTION[to]}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
