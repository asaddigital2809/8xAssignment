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
    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
      <section className="rounded bg-white p-4 shadow-sm">
        <h1 className="border-b pb-3 text-2xl font-semibold">Shopping Cart</h1>
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
    <li className="flex gap-4 py-4" aria-busy={busy}>
      <Link href={`/product/${item.productId}`} className="relative h-24 w-24 shrink-0 bg-gray-50">
        <ProductImage src={item.thumbnail} alt={item.title} fill sizes="96px" className="object-contain" />
      </Link>
      <div className="flex flex-1 flex-col gap-2">
        <Link href={`/product/${item.productId}`} className="font-medium hover:text-amber-700">
          {item.title}
        </Link>
        {overStock && (
          <p className="text-sm text-red-700">
            {item.maxQuantity === 0 ? "Out of stock. Remove it to check out." : `Only ${item.maxQuantity} left. Lower the quantity to check out.`}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center rounded border border-gray-300">
            <button
              onClick={() => setQuantity(item.productId, item.quantity - 1)}
              disabled={busy}
              aria-label={`Decrease quantity of ${item.title}`}
              className="px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
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
              className="px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button onClick={() => remove(item.productId)} disabled={busy} className="text-blue-700 hover:underline disabled:opacity-40">
            Remove
          </button>
        </div>
      </div>
      <p className="font-semibold">{formatPrice(item.priceCents * item.quantity)}</p>
    </li>
  );
}

function CartSummary({ subtotalCents, blocked }: { subtotalCents: number; blocked: boolean }) {
  const count = useCartCount();
  return (
    <aside className="h-fit rounded bg-white p-4 shadow-sm">
      <p className="text-lg">
        Subtotal ({count} {count === 1 ? "item" : "items"}): <span className="font-semibold">{formatPrice(subtotalCents)}</span>
      </p>
      {blocked ? (
        <p className="mt-4 text-sm text-red-700">Fix the items marked above to check out.</p>
      ) : (
        <Link href="/checkout" className="mt-4 block rounded-full bg-amber-400 py-2 text-center font-medium hover:bg-amber-500">
          Proceed to checkout
        </Link>
      )}
    </aside>
  );
}
