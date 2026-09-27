"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { formatPrice } from "@/domain/money";
import type { WishlistItem } from "@/domain/types";
import { useWishlistStore } from "@/state/wishlistStore";

export function WishlistView() {
  const status = useWishlistStore((s) => s.status);
  const items = useWishlistStore((s) => s.items);
  const loadError = useWishlistStore((s) => s.loadError);
  const mutationError = useWishlistStore((s) => s.mutationError);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Your wish list</h1>
      {mutationError && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {mutationError}
        </p>
      )}
      {status === "loading" && <Spinner label="Loading your wish list…" />}
      {status === "error" && <ErrorView message={loadError ?? "Couldn't load your wish list."} onRetry={() => void useWishlistStore.getState().load()} />}
      {status === "ready" && items.length === 0 && (
        <EmptyView title="Your wish list is empty" action={{ href: "/", label: "Browse products" }}>
          Use “Add to Wish List” on any product to save it for later.
        </EmptyView>
      )}
      {status === "ready" && items.length > 0 && (
        <ul className="divide-y rounded bg-white shadow-sm">
          {items.map((item) => (
            <WishlistRow key={item.productId} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function WishlistRow({ item }: { item: WishlistItem }) {
  const busy = useWishlistStore((s) => s.busy === item.productId);
  const { moveToCart, remove } = useWishlistStore.getState();

  return (
    <li className="flex flex-wrap items-center gap-4 p-4" aria-busy={busy}>
      <Link href={`/product/${item.productId}`} className="relative h-20 w-20 shrink-0 bg-gray-50">
        <ProductImage src={item.thumbnail} alt={item.title} fill sizes="80px" className="object-contain" />
      </Link>
      <div className="min-w-40 flex-1">
        <Link href={`/product/${item.productId}`} className="font-medium hover:text-amber-700">
          {item.title}
        </Link>
        <p className="text-lg font-semibold">{formatPrice(item.priceCents)}</p>
        <p className={`text-sm ${item.inStock ? "text-green-700" : "text-red-700"}`}>{item.inStock ? "In stock" : "Currently out of stock"}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => moveToCart(item.productId)}
          disabled={busy || !item.inStock}
          className="rounded-full bg-cta px-4 py-1.5 text-sm font-medium hover:bg-cta-dark disabled:opacity-50"
        >
          Move to cart
        </button>
        <button onClick={() => remove(item.productId)} disabled={busy} className="text-sm text-link hover:underline disabled:opacity-50">
          Remove
        </button>
      </div>
    </li>
  );
}
