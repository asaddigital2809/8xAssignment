"use client";

import { OrderSummary } from "@/components/OrderSummary";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { useOrders } from "@/state/orders";

export default function OrdersPage() {
  const { state, retry } = useOrders();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Your Orders</h1>
      {state.status === "loading" && <Spinner label="Loading orders…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyView title="You haven't placed any orders yet" action={{ href: "/", label: "Start shopping" }} />
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
