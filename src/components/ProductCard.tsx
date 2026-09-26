import { ProductImage } from "@/components/ProductImage";
import { Stars } from "@/components/Stars";
import Link from "next/link";
import { formatPrice } from "@/domain/money";
import type { Product } from "@/domain/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} className="group flex flex-col rounded bg-white p-3 shadow-sm hover:shadow">
      <div className="relative aspect-square bg-gray-50">
        <ProductImage src={product.thumbnail} alt={product.title} fill sizes="(max-width: 640px) 50vw, 200px" className="object-contain" />
      </div>
      <p className="mt-2 line-clamp-2 text-sm group-hover:text-amber-700">{product.title}</p>
      <p className="mt-auto flex items-center gap-1 pt-1 text-xs text-gray-500">
        <Stars rating={product.rating} size="text-xs" />
        {product.reviewCount > 0 && <span>({product.reviewCount})</span>}
      </p>
      <p className="text-lg font-semibold">{formatPrice(product.priceCents)}</p>
      {product.stock === 0 && <p className="text-xs text-red-700">Out of stock</p>}
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2">
      {products.map((p) => (
        <div key={p.id} className="w-44 shrink-0 snap-start">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
