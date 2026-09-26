"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { EmptyView, Spinner } from "@/components/StatusViews";
import { formatPrice } from "@/domain/money";
import type { Address } from "@/domain/types";
import { useCartHydrated, useCartItems, useCartSubtotal } from "@/state/cartStore";
import { useAddressForm } from "@/state/checkoutForm";
import { usePlaceOrder } from "@/state/orders";

const FIELDS: { name: keyof Address; label: string; autoComplete: string }[] = [
  { name: "fullName", label: "Full name", autoComplete: "name" },
  { name: "line1", label: "Street address", autoComplete: "address-line1" },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "postalCode", label: "Postal code", autoComplete: "postal-code" },
  { name: "country", label: "Country", autoComplete: "country-name" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const items = useCartItems();
  const subtotal = useCartSubtotal();
  const form = useAddressForm();
  const { state, submit } = usePlaceOrder();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const address = form.validate();
    if (!address) return;
    const order = await submit(address);
    if (order) router.push(`/orders/${order.id}?placed=1`);
  }

  if (!hydrated) return <Spinner label="Loading your cart…" />;
  if (state.status === "placed") return <Spinner label="Order placed. Opening confirmation…" />;
  if (items.length === 0) {
    return <EmptyView title="Nothing to check out" action={{ href: "/", label: "Continue shopping" }} />;
  }

  const submitting = state.status === "submitting";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 md:grid-cols-[1fr_300px]">
      <section className="rounded bg-white p-4 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold">Checkout</h1>
        <h2 className="mb-2 font-medium">Shipping address</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.name} className={`text-sm ${f.name === "line1" ? "sm:col-span-2" : ""}`}>
              {f.label}
              <input
                name={f.name}
                value={form.address[f.name]}
                onChange={(e) => form.setField(f.name, e.target.value)}
                autoComplete={f.autoComplete}
                aria-invalid={Boolean(form.errors[f.name])}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 aria-[invalid=true]:border-red-500"
              />
              {form.errors[f.name] && <span className="text-xs text-red-700">{form.errors[f.name]}</span>}
            </label>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-500">Payment is mocked. No card is needed.</p>
      </section>

      <aside className="h-fit rounded bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-medium">Order summary</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span className="line-clamp-1">
                {i.quantity} × {i.title}
              </span>
              <span>{formatPrice(i.priceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </p>
        {state.status === "error" && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {state.message}
          </p>
        )}
        <button type="submit" disabled={submitting} className="mt-4 w-full rounded-full bg-amber-400 py-2 font-medium hover:bg-amber-500 disabled:opacity-60">
          {submitting ? "Placing order…" : "Place Order"}
        </button>
      </aside>
    </form>
  );
}
