"use client";

import { ProductImage } from "@/components/ProductImage";
import Link from "next/link";
import { EmptyView, Spinner } from "@/components/StatusViews";
import { formatPrice } from "@/domain/money";
import type { CartItem } from "@/domain/types";
import { useCartCount, useCartHydrated, useCartItems, useCartStore, useCartSubtotal } from "@/state/cartStore";

export function CartView() {
  const hydrated = useCartHydrated();
  const items = useCartItems();

  if (!hydrated) return <Spinner label="Loading your cart…" />;
  if (items.length === 0) {
    return <EmptyView title="Your cart is empty" action={{ href: "/", label: "Continue shopping" }} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
      <section className="rounded bg-white p-4 shadow-sm">
        <h1 className="border-b pb-3 text-2xl font-semibold">Shopping Cart</h1>
        <ul className="divide-y">
          {items.map((item) => (
            <CartLine key={item.productId} item={item} />
          ))}
        </ul>
      </section>
      <CartSummary />
    </div>
  );
}

function CartLine({ item }: { item: CartItem }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  return (
    <li className="flex gap-4 py-4">
      <Link href={`/product/${item.productId}`} className="relative h-24 w-24 shrink-0 bg-gray-50">
        <ProductImage src={item.thumbnail} alt={item.title} fill sizes="96px" className="object-contain" />
      </Link>
      <div className="flex flex-1 flex-col gap-2">
        <Link href={`/product/${item.productId}`} className="font-medium hover:text-amber-700">
          {item.title}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center rounded border border-gray-300">
            <button onClick={() => setQuantity(item.productId, item.quantity - 1)} aria-label={`Decrease quantity of ${item.title}`} className="px-3 py-1 hover:bg-gray-100">
              −
            </button>
            <span className="min-w-8 text-center" aria-label="Quantity">
              {item.quantity}
            </span>
            <button
              onClick={() => setQuantity(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.maxQuantity}
              aria-label={`Increase quantity of ${item.title}`}
              className="px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button onClick={() => remove(item.productId)} className="text-blue-700 hover:underline">
            Remove
          </button>
        </div>
      </div>
      <p className="font-semibold">{formatPrice(item.priceCents * item.quantity)}</p>
    </li>
  );
}

function CartSummary() {
  const count = useCartCount();
  const subtotal = useCartSubtotal();
  return (
    <aside className="h-fit rounded bg-white p-4 shadow-sm">
      <p className="text-lg">
        Subtotal ({count} {count === 1 ? "item" : "items"}): <span className="font-semibold">{formatPrice(subtotal)}</span>
      </p>
      <Link href="/checkout" className="mt-4 block rounded-full bg-amber-400 py-2 text-center font-medium hover:bg-amber-500">
        Proceed to checkout
      </Link>
    </aside>
  );
}
