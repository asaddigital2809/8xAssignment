"use client";

import Link from "next/link";
import { OrderSummary } from "@/components/OrderSummary";
import { ErrorView, Spinner } from "@/components/StatusViews";
import { useOrder } from "@/state/orders";

/** Order detail page; doubles as the post-checkout confirmation when `justPlaced` is set. */
export function OrderDetail({ id, justPlaced }: { id: string; justPlaced: boolean }) {
  const { state, retry } = useOrder(id);

  if (state.status === "loading") return <Spinner label="Loading order…" />;
  if (state.status === "error") return <ErrorView message={state.error.message} onRetry={retry} />;

  return (
    <div className="space-y-4">
      {justPlaced && (
        <div className="rounded border border-green-300 bg-green-50 p-4">
          <p className="text-lg font-semibold text-green-800">Order placed, thank you!</p>
          <p className="text-sm text-green-800">Confirmation number: {state.data.id}</p>
        </div>
      )}
      <OrderSummary order={state.data} showAddress />
      <div className="flex gap-4 text-sm">
        <Link href="/orders" className="text-blue-700 hover:underline">
          View all orders
        </Link>
        <Link href="/" className="text-blue-700 hover:underline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
