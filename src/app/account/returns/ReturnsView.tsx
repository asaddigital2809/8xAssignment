"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { formatOrderDate } from "@/components/OrderSummary";
import { formatPrice } from "@/domain/money";
import { RETURN_REASONS, RETURN_STATUS_LABEL, type ReturnRequestView, type ReturnStatus } from "@/domain/returns";
import { useReturns } from "@/state/returns";

const STATUS_STYLE: Record<ReturnStatus, string> = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  refunded: "bg-green-100 text-green-800",
};

const NEXT_STEP: Record<ReturnStatus, string> = {
  requested: "We're reviewing your request.",
  approved: "Approved. Send the items back; your refund follows once they arrive.",
  rejected: "This return wasn't accepted.",
  refunded: "Refunded to your original payment method.",
};

export function ReturnsView() {
  const { state, retry } = useReturns();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Your returns</h1>
      {state.status === "loading" && <Spinner label="Loading your returns…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyView title="No returns" action={{ href: "/orders?status=delivered", label: "See delivered orders" }}>
          You can return items from delivered orders within 30 days.
        </EmptyView>
      )}
      {state.status === "success" && state.data.map((r) => <ReturnCard key={r.id} r={r} />)}
    </div>
  );
}

function ReturnCard({ r }: { r: ReturnRequestView }) {
  return (
    <article className="rounded bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-t bg-gray-50 px-4 py-2 text-sm text-gray-600">
        <span>Requested {formatOrderDate(r.createdAt)}</span>
        <Link href={`/orders/${r.orderId}`} className="text-blue-700 hover:underline">
          Order # {r.orderId}
        </Link>
        <span>Return # {r.id}</span>
        <span className={`rounded px-2 text-xs leading-5 font-medium ${STATUS_STYLE[r.status]}`}>{RETURN_STATUS_LABEL[r.status]}</span>
      </header>
      <ul className="divide-y px-4">
        {r.items.map((i) => (
          <li key={i.productId} className="flex items-center gap-3 py-3">
            <div className="relative h-12 w-12 shrink-0 bg-gray-50">
              {i.thumbnail && <ProductImage src={i.thumbnail} alt="" fill sizes="48px" className="object-contain" />}
            </div>
            <span className="flex-1 text-sm">{i.title}</span>
            <span className="text-sm text-gray-600">Qty {i.quantity}</span>
          </li>
        ))}
      </ul>
      <footer className="flex flex-wrap justify-between gap-2 border-t px-4 py-3 text-sm">
        <span className="text-gray-700">
          {RETURN_REASONS[r.reason]}
          {r.comment && <span className="text-gray-500">: “{r.comment}”</span>}
        </span>
        <span>
          Refund <strong>{formatPrice(r.refundCents)}</strong>
        </span>
        <p className="w-full text-gray-600">{NEXT_STEP[r.status]}</p>
      </footer>
    </article>
  );
}
