import Link from "next/link";
import { Price } from "@/components/Price";
import { ProductImage } from "@/components/ProductImage";
import { Stars } from "@/components/Stars";
import { estimatedDelivery } from "@/domain/money";
import type { Product } from "@/domain/types";

const deliveryLabel = () => estimatedDelivery(new Date()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const outOfStock = product.stock === 0;
  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex h-full flex-col rounded-md bg-white p-3 ring-1 ring-black/5 transition hover:shadow-md"
    >
      <div className="relative aspect-square rounded bg-gray-50">
        <ProductImage
          src={product.thumbnail}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, 220px"
          className="object-contain p-2 transition group-hover:scale-[1.03]"
        />
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-snug group-hover:text-[#c7511f]">{product.title}</p>
      <p className="mt-1 flex items-center gap-1 text-xs">
        <Stars rating={product.rating} size="text-sm" />
        {product.reviewCount > 0 && <span className="text-link">{product.reviewCount}</span>}
      </p>
      <div className="mt-auto pt-1">
        <Price cents={product.priceCents} size={compact ? "sm" : "md"} />
        {!compact &&
          (outOfStock ? (
            <p className="text-xs text-deal">Currently unavailable</p>
          ) : (
            <p className="text-xs text-gray-600">
              FREE delivery <b className="text-gray-900">{deliveryLabel()}</b>
            </p>
          ))}
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
      {products.map((p) => (
        <div key={p.id} className="w-40 shrink-0 snap-start sm:w-48">
          <ProductCard product={p} compact />
        </div>
      ))}
    </div>
  );
}
