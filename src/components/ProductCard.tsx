"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { Price } from "@/components/Price";
import { ProductImage } from "@/components/ProductImage";
import { Stars } from "@/components/Stars";
import { TiltCard } from "@/components/TiltCard";
import { estimatedDelivery } from "@/domain/money";
import type { Product } from "@/domain/types";
import { heroName, useHeroStore } from "@/state/heroTransition";
import { useImageAccent } from "@/state/imageAccent";

/**
 * `sizes` shared with the product page's hero base layer: the same value yields the same
 * optimized image URL, so the hero can show the already-loaded card image instantly.
 */
export const CARD_IMAGE_SIZES = "(max-width: 640px) 50vw, 240px";

const deliveryLabel = () => estimatedDelivery(new Date()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function ProductCard({ product, compact = false, listKey = "list" }: { product: Product; compact?: boolean; listKey?: string }) {
  const palette = useImageAccent(product.thumbnail);
  const heroKey = `${listKey}:${product.id}`;
  const isHeroSource = useHeroStore((s) => s.source === heroKey);
  const setHeroSource = useHeroStore((s) => s.setSource);
  const outOfStock = product.stock === 0;

  return (
    <TiltCard palette={palette} className="h-full">
      <Link href={`/product/${product.id}`} onClick={() => setHeroSource(heroKey)} className="flex h-full flex-col rounded-xl p-3 outline-offset-4">
        {/* Image well tinted with the product's own color. */}
        <div
          className="card-well relative overflow-hidden rounded-lg transition-[background] duration-500"
          style={{ background: "radial-gradient(circle at 50% 45%, var(--accent-tint) 0%, var(--accent-soft) 55%, #fff 100%)" }}
        >
          {/* Only the opened card carries the shared name (names must be unique per page). */}
          <ViewTransition name={isHeroSource ? heroName(product.id) : undefined} share="morph" default="none">
            <div className="card-image relative aspect-square">
              <ProductImage src={product.thumbnail} alt={product.title} fill sizes={CARD_IMAGE_SIZES} className="object-contain p-3" />
            </div>
          </ViewTransition>
          {outOfStock && <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-deal shadow-sm">Unavailable</span>}
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-snug font-medium text-gray-900 transition-colors group-hover:text-[var(--accent)]">{product.title}</p>
        <p className="mt-1 flex items-center gap-1 text-xs">
          <Stars rating={product.rating} size="text-sm" />
          {product.reviewCount > 0 && <span className="text-link">{product.reviewCount}</span>}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <Price cents={product.priceCents} size={compact ? "sm" : "md"} />
            {!compact && !outOfStock && (
              <p className="text-xs text-gray-600">
                FREE delivery <b className="text-gray-900">{deliveryLabel()}</b>
              </p>
            )}
          </div>
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 translate-x-1 items-center justify-center rounded-full bg-[var(--accent)] text-sm text-white opacity-0 shadow-md transition duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          >
            →
          </span>
        </div>
        {/* Accent bar that grows on hover. */}
        <span aria-hidden className="absolute inset-x-4 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-[var(--accent)] transition-transform duration-300 group-hover:scale-x-100" />
      </Link>
    </TiltCard>
  );
}

export function ProductGrid({ products, listKey = "grid" }: { products: Product[]; listKey?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} listKey={listKey} />
      ))}
    </div>
  );
}

export function ProductRail({ products, listKey = "rail" }: { products: Product[]; listKey?: string }) {
  return (
    // Padding gives the lifted cards and their colored shadows room inside the scroller.
    <div className="-mx-2 flex snap-x gap-4 overflow-x-auto px-2 pt-2 pb-5">
      {products.map((p) => (
        <div key={p.id} className="w-44 shrink-0 snap-start sm:w-52">
          <ProductCard product={p} compact listKey={listKey} />
        </div>
      ))}
    </div>
  );
}
