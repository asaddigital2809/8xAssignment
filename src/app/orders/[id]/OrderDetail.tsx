"use client";

import Link from "next/link";
import { OrderSummary } from "@/components/OrderSummary";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { NotFoundError } from "@/data/http";
import type { Order } from "@/domain/types";
import { useOrder } from "@/state/orders";
import { useReturnOptions } from "@/state/returns";

/** Order detail page; doubles as the post-checkout confirmation when `justPlaced` is set. */
export function OrderDetail({ id, justPlaced }: { id: string; justPlaced: boolean }) {
  const { state, retry } = useOrder(id);

  if (state.status === "loading") return <Spinner label="Loading order…" />;
  if (state.status === "error") {
    // Someone else's order is a 404 too, so this reads the same either way.
    if (state.error instanceof NotFoundError) return <EmptyView title="Order not found" action={{ href: "/orders", label: "Your orders" }} />;
    return <ErrorView message={state.error.message} onRetry={retry} />;
  }

  return (
    <div className="space-y-4">
      {justPlaced && (
        <div className="rounded border border-green-300 bg-green-50 p-4">
          <p className="text-lg font-semibold text-green-800">Order placed, thank you!</p>
          <p className="text-sm text-green-800">Confirmation number: {state.data.id}</p>
        </div>
      )}
      <OrderSummary order={state.data} showAddress />
      {state.data.status === "delivered" && <ReturnsSection order={state.data} />}
      <div className="flex gap-4 text-sm">
        <Link href="/orders" className="text-link hover:underline">
          View all orders
        </Link>
        <Link href="/" className="text-link hover:underline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function ReturnsSection({ order }: { order: Order }) {
  const { state, retry } = useReturnOptions(order.id);
  if (state.status === "loading") return <Spinner label="Checking return options…" />;
  if (state.status === "error") return <ErrorView message={state.error.message} onRetry={retry} />;

  const { eligible, reason, closesAt } = state.data;
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded bg-white p-4 text-sm shadow-sm">
      <div>
        <p className="font-medium">Returns</p>
        <p className="text-gray-600">
          {eligible && closesAt ? `Eligible for return until ${new Date(closesAt).toLocaleDateString("en-US", { dateStyle: "medium" })}.` : reason}
        </p>
      </div>
      <div className="flex gap-3">
        {eligible && (
          <Link href={`/orders/${order.id}/return`} className="rounded-full bg-cta px-4 py-1.5 font-medium hover:bg-cta-dark">
            Return items
          </Link>
        )}
        <Link href="/account/returns" className="self-center text-link hover:underline">
          Your returns
        </Link>
      </div>
    </section>
  );
}
