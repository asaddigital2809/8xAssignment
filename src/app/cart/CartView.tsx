"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { formatPrice } from "@/domain/money";
import type { CartItem } from "@/domain/types";
import { useCart, useCartCount, useCartStatus, useCartStore } from "@/state/cartStore";

export function CartView() {
  const status = useCartStatus();
  const cart = useCart();
  const loadError = useCartStore((s) => s.loadError);
  const mutationError = useCartStore((s) => s.mutationError);

  if (status === "loading") return <Spinner label="Loading your cart…" />;
  if (status === "error" || !cart) {
    return <ErrorView message={loadError ?? "Couldn't load your cart."} onRetry={() => void useCartStore.getState().load()} />;
  }
  if (cart.items.length === 0) {
    return <EmptyView title="Your cart is empty" action={{ href: "/", label: "Continue shopping" }} />;
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
      <section className="rounded-md bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-end justify-between border-b pb-2">
          <h1 className="text-3xl font-medium">Shopping Cart</h1>
          <span className="hidden text-sm text-gray-600 sm:block">Price</span>
        </div>
        {mutationError && (
          <p role="alert" className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {mutationError}
          </p>
        )}
        <ul className="divide-y">
          {cart.items.map((item) => (
            <CartLine key={item.productId} item={item} />
          ))}
        </ul>
      </section>
      <CartSummary subtotalCents={cart.subtotalCents} blocked={cart.items.some((i) => i.quantity > i.maxQuantity)} />
    </div>
  );
}

function CartLine({ item }: { item: CartItem }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const busy = useCartStore((s) => s.busy === item.productId);
  const overStock = item.quantity > item.maxQuantity;

  return (
    <li className={`flex gap-4 py-4 transition-opacity ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
      <Link href={`/product/${item.productId}`} className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
        <ProductImage src={item.thumbnail} alt={item.title} fill sizes="144px" className="object-contain" />
      </Link>
      <div className="flex flex-1 flex-col gap-1.5">
        <Link href={`/product/${item.productId}`} className="text-lg leading-snug hover:text-[#c7511f]">
          {item.title}
        </Link>
        {overStock ? (
          <p className="text-sm text-deal">
            {item.maxQuantity === 0 ? "Out of stock. Remove it to check out." : `Only ${item.maxQuantity} left. Lower the quantity to check out.`}
          </p>
        ) : (
          <p className="text-xs text-green-700">In Stock</p>
        )}
        <p className="text-xs text-gray-600">Eligible for FREE delivery and 30-day returns</p>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <div className="flex items-center rounded-full border-2 border-cta">
            <button
              onClick={() => setQuantity(item.productId, item.quantity - 1)}
              disabled={busy}
              aria-label={`Decrease quantity of ${item.title}`}
              className="rounded-l-full px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-8 text-center" aria-label="Quantity">
              {item.quantity}
            </span>
            <button
              onClick={() => setQuantity(item.productId, item.quantity + 1)}
              disabled={busy || item.quantity >= item.maxQuantity}
              aria-label={`Increase quantity of ${item.title}`}
              className="rounded-r-full px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button onClick={() => remove(item.productId)} disabled={busy} className="text-link hover:underline disabled:opacity-40">
            Remove
          </button>
        </div>
      </div>
      <p className="text-lg font-bold">{formatPrice(item.priceCents * item.quantity)}</p>
    </li>
  );
}

function CartSummary({ subtotalCents, blocked }: { subtotalCents: number; blocked: boolean }) {
  const count = useCartCount();
  return (
    <aside className="space-y-3 rounded-md bg-white p-5 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-4">
      <p className="flex items-start gap-2 text-sm text-green-800">
        <span aria-hidden className="mt-0.5 rounded-full bg-green-700 px-1.5 text-xs text-white">
          ✓
        </span>
        Your order qualifies for FREE delivery.
      </p>
      <p className="text-lg">
        Subtotal ({count} {count === 1 ? "item" : "items"}): <span className="font-bold">{formatPrice(subtotalCents)}</span>
      </p>
      {blocked ? (
        <p className="text-sm text-deal">Fix the items marked in your cart to check out.</p>
      ) : (
        <Link href="/checkout" className="block rounded-full bg-cta py-2 text-center text-sm font-medium shadow-sm hover:bg-cta-dark">
          Proceed to checkout
        </Link>
      )}
    </aside>
  );
}
