"use client";

import Link from "next/link";
import { useState, ViewTransition } from "react";
import { CARD_IMAGE_SIZES } from "@/components/ProductCard";
import { ChevronRight, HeartIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { Price } from "@/components/Price";
import { ProductImage } from "@/components/ProductImage";
import { Stars } from "@/components/Stars";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { NotFoundError } from "@/data/http";
import { maxQuantityFor } from "@/domain/cart";
import { estimatedDelivery } from "@/domain/money";
import type { Product } from "@/domain/types";
import { useCartStore } from "@/state/cartStore";
import { useCategories, useProduct } from "@/state/catalogQueries";
import { heroName } from "@/state/heroTransition";
import { useImageAccent } from "@/state/imageAccent";
import { useIsSaved, useWishlistStore } from "@/state/wishlistStore";
import { Reviews } from "./Reviews";

export function ProductDetail({ id }: { id: string }) {
  const { state, retry } = useProduct(id);

  if (state.status === "loading") return <Spinner label="Loading product…" />;
  if (state.status === "error") {
    if (state.error instanceof NotFoundError) {
      return <EmptyView title="Product not found" action={{ href: "/search", label: "Browse products" }} />;
    }
    return <ErrorView message={state.error.message} onRetry={retry} />;
  }
  return (
    <div className="space-y-6">
      <ProductView product={state.data} />
      <Reviews productId={state.data.id} />
    </div>
  );
}

function ProductView({ product }: { product: Product }) {
  const images = product.images.length > 0 ? product.images : [product.thumbnail];
  const [activeImage, setActiveImage] = useState(images[0]);
  const categories = useCategories();
  const category = categories.state.status === "success" ? categories.state.data.find((c) => c.id === product.categoryId) : undefined;

  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-gray-600">
        <Link href="/search" className="hover:underline">
          All departments
        </Link>
        <ChevronRight />
        <Link href={`/search?category=${product.categoryId}`} className="hover:underline">
          {category?.name ?? product.categoryId}
        </Link>
        <ChevronRight />
        <span className="max-w-60 truncate text-gray-900">{product.title}</span>
      </nav>

      <div className="grid gap-6 rounded-md bg-white p-4 shadow-sm ring-1 ring-black/5 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_280px]">
        {/* Gallery: vertical thumbnails on large screens; hover or click to preview. */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {images.length > 1 && (
            <div className="flex gap-2 sm:flex-col">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(src)}
                  onMouseEnter={() => setActiveImage(src)}
                  aria-label={`Show image ${i + 1}`}
                  aria-pressed={src === activeImage}
                  className={`relative h-14 w-14 shrink-0 rounded-md border bg-white ${src === activeImage ? "border-[#e77600] ring-2 ring-[#e77600]/30" : "border-gray-300"}`}
                >
                  <ProductImage src={src} alt="" fill sizes="56px" className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
          <HeroImage product={product} src={activeImage} />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl leading-snug font-medium">{product.title}</h1>
          {product.brand && (
            <Link href={`/search?q=${encodeURIComponent(product.brand)}`} className="block text-sm text-link hover:text-[#c7511f] hover:underline">
              Visit the {product.brand} store
            </Link>
          )}
          <a href="#reviews-heading" className="flex items-center gap-2 text-sm hover:text-[#c7511f]">
            <span>{product.rating.toFixed(1)}</span>
            <Stars rating={product.rating} size="text-base" />
            {product.reviewCount > 0 && (
              <span className="text-link">
                {product.reviewCount} {product.reviewCount === 1 ? "rating" : "ratings"}
              </span>
            )}
          </a>
          <hr />
          <Price cents={product.priceCents} size="lg" />
          <p className="text-sm text-gray-700">
            <b>FREE Returns</b> within 30 days of delivery.
          </p>
          <hr />
          <div>
            <h2 className="mb-1 font-bold">About this item</h2>
            <p className="text-sm leading-relaxed text-gray-800">{product.description}</p>
          </div>
        </div>

        <aside aria-label="Buy" className="h-fit space-y-3 rounded-md border p-4">
          <Price cents={product.priceCents} size="md" />
          <p className="flex items-start gap-2 text-sm">
            <TruckIcon className="mt-0.5 shrink-0 text-gray-600" />
            <span>
              FREE delivery <b>{estimatedDelivery(new Date()).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</b>
            </span>
          </p>
          <AddToCart product={product} />
          <WishlistButton productId={product.id} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t pt-2 text-xs text-gray-600">
            <dt>Ships from</dt>
            <dd>amzn.clone</dd>
            <dt>Sold by</dt>
            <dd>amzn.clone</dd>
            <dt>Payment</dt>
            <dd className="flex items-center gap-1">
              <ShieldIcon width={14} height={14} /> Secure transaction
            </dd>
          </dl>
        </aside>
      </div>
    </div>
  );
}

/**
 * The main image, and the landing spot of the card's shared-element ("hero") transition:
 * the same ViewTransition name as the opened card, so the browser morphs one into the
 * other. Underneath sits the card's thumbnail (same `sizes`, so the same cached URL) until
 * the large image has loaded, so the page never shows an empty box mid-transition.
 */
function HeroImage({ product, src }: { product: Product; src: string }) {
  const palette = useImageAccent(product.thumbnail);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;

  return (
    <div
      className="relative flex-1 overflow-hidden rounded-xl transition-[background] duration-500"
      style={{ background: `radial-gradient(circle at 50% 45%, ${palette?.tint ?? "#f1f5f9"} 0%, ${palette?.soft ?? "#f8fafc"} 55%, #fff 100%)` }}
    >
      <ViewTransition name={heroName(product.id)} share="morph" default="none">
        <div className="relative aspect-square">
          {!loaded && (
            <ProductImage src={product.thumbnail} alt="" aria-hidden fill sizes={CARD_IMAGE_SIZES} className="object-contain p-3" />
          )}
          <ProductImage
            src={src}
            alt={product.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            onLoad={() => setLoadedSrc(src)}
            className={`object-contain p-3 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      </ViewTransition>
    </div>
  );
}

/** Save for later. Works for out-of-stock items too; signed-out users go to sign-in (401). */
function WishlistButton({ productId }: { productId: string }) {
  const saved = useIsSaved(productId);
  const busy = useWishlistStore((s) => s.busy === productId);
  const error = useWishlistStore((s) => s.mutationError);
  const { add, remove } = useWishlistStore.getState();

  return (
    <div className="space-y-1">
      {saved ? (
        <p className="flex items-center gap-3 text-sm">
          <span className="font-medium text-green-700">✓ Saved to your wish list</span>
          <Link href="/account/wishlist" className="text-link hover:underline">
            View
          </Link>
          <button onClick={() => remove(productId)} disabled={busy} className="text-link hover:underline disabled:opacity-50">
            Remove
          </button>
        </p>
      ) : (
        <button
          onClick={() => add(productId)}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          <HeartIcon width={16} height={16} />
          {busy ? "Saving…" : "Add to Wish List"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
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

  if (max === 0) return <p className="text-lg font-medium text-deal">Currently out of stock.</p>;

  return (
    <div className="space-y-3">
      <p className={`text-lg font-medium ${product.stock < 10 ? "text-deal" : "text-green-700"}`}>
        {product.stock < 10 ? `Only ${product.stock} left in stock` : "In Stock"}
      </p>
      <label className="flex w-fit items-center gap-2 rounded-md bg-gray-100 px-2 py-1 text-sm shadow-sm ring-1 ring-gray-300">
        Quantity:
        <select name="quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="bg-transparent outline-none">
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
        className="w-full rounded-full bg-cta py-2 text-sm font-medium shadow-sm hover:bg-cta-dark disabled:opacity-60"
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
          ✓ {inCart} in your cart ·{" "}
          <Link href="/cart" className="text-link hover:underline">
            Go to cart
          </Link>
        </p>
      )}
    </div>
  );
}
