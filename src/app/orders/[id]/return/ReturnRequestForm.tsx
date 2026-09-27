"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ProductImage } from "@/components/ProductImage";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { NotFoundError } from "@/data/http";
import { RETURN_REASONS, type ReturnReason } from "@/domain/returns";
import { useReturnForm, useReturnOptions } from "@/state/returns";

export function ReturnRequestForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { state, retry } = useReturnOptions(orderId);
  const form = useReturnForm(orderId);

  if (state.status === "loading") return <Spinner label="Loading your order…" />;
  if (state.status === "error") {
    if (state.error instanceof NotFoundError) return <EmptyView title="Order not found" action={{ href: "/orders", label: "Your orders" }} />;
    return <ErrorView message={state.error.message} onRetry={retry} />;
  }
  if (!state.data.eligible) {
    return (
      <EmptyView title="This order can't be returned" action={{ href: `/orders/${orderId}`, label: "Back to order" }}>
        {state.data.reason}
      </EmptyView>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const created = await form.submit();
    if (created) router.push("/account/returns");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Return items</h1>
      <p className="text-sm text-gray-600">
        Order{" "}
        <Link href={`/orders/${orderId}`} className="text-link hover:underline">
          # {orderId}
        </Link>
        . Choose what you&apos;re sending back. Your refund is calculated from what you paid.
      </p>

      <fieldset className="rounded bg-white p-4 shadow-sm">
        <legend className="sr-only">Items to return</legend>
        <ul className="divide-y">
          {state.data.items.map((i) => (
            <li key={i.productId} className="flex items-center gap-3 py-3">
              <div className="relative h-14 w-14 shrink-0 bg-gray-50">
                <ProductImage src={i.thumbnail} alt="" fill sizes="56px" className="object-contain" />
              </div>
              <div className="flex-1 text-sm">
                <p>{i.title}</p>
                <p className="text-gray-500">
                  Bought {i.purchased}
                  {i.remaining < i.purchased && ` · ${i.purchased - i.remaining} already in a return`}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                Return
                <select
                  name={`qty-${i.productId}`}
                  value={form.quantities[i.productId] ?? 0}
                  onChange={(e) => form.setQuantity(i.productId, Number(e.target.value))}
                  disabled={i.remaining === 0}
                  className="rounded border border-gray-300 px-2 py-1 disabled:opacity-50"
                >
                  {Array.from({ length: i.remaining + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="space-y-3 rounded bg-white p-4 shadow-sm">
        <label className="block text-sm">
          Reason
          <select
            name="reason"
            value={form.reason}
            onChange={(e) => form.setReason(e.target.value as ReturnReason)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">Choose a reason</option>
            {Object.entries(RETURN_REASONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Comments (optional)
          <textarea
            name="comment"
            value={form.comment}
            onChange={(e) => form.setComment(e.target.value)}
            maxLength={500}
            rows={3}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
      </div>

      {form.error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {form.error}
        </p>
      )}
      <button disabled={form.submitting} className="rounded-full bg-cta px-6 py-2 font-medium hover:bg-cta-dark disabled:opacity-60">
        {form.submitting ? "Submitting…" : "Request return"}
      </button>
    </form>
  );
}
