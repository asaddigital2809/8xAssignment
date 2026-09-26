"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { useState } from "react";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { NotFoundError } from "@/data/http";
import { maxQuantityFor } from "@/domain/cart";
import { formatPrice } from "@/domain/money";
import type { Product } from "@/domain/types";
import { useCartStore } from "@/state/cartStore";
import { useProduct } from "@/state/catalogQueries";

export function ProductDetail({ id }: { id: string }) {
  const { state, retry } = useProduct(id);

  if (state.status === "loading") return <Spinner label="Loading product…" />;
  if (state.status === "error") {
    if (state.error instanceof NotFoundError) {
      return <EmptyView title="Product not found" action={{ href: "/search", label: "Browse products" }} />;
    }
    return <ErrorView message={state.error.message} onRetry={retry} />;
  }
  return <ProductView product={state.data} />;
}

function ProductView({ product }: { product: Product }) {
  const images = product.images.length > 0 ? product.images : [product.thumbnail];
  const [activeImage, setActiveImage] = useState(images[0]);

  return (
    <div className="grid gap-6 rounded bg-white p-4 shadow-sm md:grid-cols-2">
      <div>
        <div className="relative aspect-square bg-gray-50">
          <ProductImage src={activeImage} alt={product.title} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-contain" />
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {images.map((src, i) => (
              <button
                key={src}
                onClick={() => setActiveImage(src)}
                aria-label={`Show image ${i + 1}`}
                className={`relative h-16 w-16 rounded border ${src === activeImage ? "border-amber-500" : "border-gray-200"}`}
              >
                <ProductImage src={src} alt="" fill sizes="64px" className="object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        {product.brand && <p className="text-sm text-gray-600">Brand: {product.brand}</p>}
        <p className="text-sm text-gray-600">★ {product.rating.toFixed(1)}</p>
        <p className="text-3xl font-semibold">{formatPrice(product.priceCents)}</p>
        <p className="text-gray-700">{product.description}</p>
        <AddToCart product={product} />
      </div>
    </div>
  );
}

function AddToCart({ product }: { product: Product }) {
  const add = useCartStore((s) => s.add);
  const busy = useCartStore((s) => s.busy === product.id);
  const error = useCartStore((s) => s.mutationError);
  const inCart = useCartStore((s) => s.cart?.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const max = maxQuantityFor(product);
  const [quantity, setQuantity] = useState(1);

  if (max === 0) return <p className="font-medium text-red-700">Currently out of stock.</p>;

  return (
    <div className="mt-2 space-y-3 rounded border border-gray-200 p-4">
      <p className="text-sm text-green-700">In stock</p>
      <label className="flex items-center gap-2 text-sm">
        Qty
        <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      {/* Signed-out users get a 401 from the API and are sent to sign-in, then back here. */}
      <button
        onClick={() => add(product.id, quantity)}
        disabled={busy}
        className="w-full rounded-full bg-amber-400 py-2 font-medium hover:bg-amber-500 disabled:opacity-60"
      >
        {busy ? "Adding…" : "Add to Cart"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {inCart > 0 && (
        <p className="text-sm">
          {inCart} in your cart ·{" "}
          <Link href="/cart" className="text-blue-700 hover:underline">
            Go to cart
          </Link>
        </p>
      )}
    </div>
  );
}
