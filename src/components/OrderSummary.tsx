import { ProductImage } from "@/components/ProductImage";
import Link from "next/link";
import { formatPrice } from "@/domain/money";
import type { Order } from "@/domain/types";

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function OrderSummary({ order, showAddress = false }: { order: Order; showAddress?: boolean }) {
  return (
    <article className="rounded bg-white shadow-sm">
      <header className="flex flex-wrap justify-between gap-2 rounded-t bg-gray-50 px-4 py-2 text-sm text-gray-600">
        <span>Placed {formatOrderDate(order.placedAt)}</span>
        <span>Total {formatPrice(order.subtotalCents)}</span>
        <Link href={`/orders/${order.id}`} className="text-blue-700 hover:underline">
          Order # {order.id}
        </Link>
      </header>
      <ul className="divide-y px-4">
        {order.lines.map((line) => (
          <li key={line.productId} className="flex items-center gap-3 py-3">
            <div className="relative h-14 w-14 shrink-0 bg-gray-50">
              <ProductImage src={line.thumbnail} alt="" fill sizes="56px" className="object-contain" />
            </div>
            <Link href={`/product/${line.productId}`} className="flex-1 text-sm hover:text-amber-700">
              {line.title}
            </Link>
            <span className="text-sm text-gray-600">
              {line.quantity} × {formatPrice(line.priceCents)}
            </span>
          </li>
        ))}
      </ul>
      {showAddress && (
        <footer className="border-t px-4 py-3 text-sm text-gray-700">
          <p className="font-medium">Shipping to</p>
          <p>
            {order.address.fullName}, {order.address.line1}, {order.address.city} {order.address.postalCode}, {order.address.country}
          </p>
        </footer>
      )}
    </article>
  );
}
