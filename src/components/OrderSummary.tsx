import { ProductImage } from "@/components/ProductImage";
import Link from "next/link";
import { ORDER_STATUS_LABEL } from "@/domain/checkout";
import { formatPrice } from "@/domain/money";
import { BRAND_LABEL, type CardBrand } from "@/domain/payment";
import type { Order, OrderStatus } from "@/domain/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-gray-200 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function OrderSummary({ order, showAddress = false }: { order: Order; showAddress?: boolean }) {
  return (
    <article className="rounded bg-white shadow-sm">
      <header className="flex flex-wrap justify-between gap-2 rounded-t bg-gray-50 px-4 py-2 text-sm text-gray-600">
        <span>Placed {formatOrderDate(order.placedAt)}</span>
        <span>Total {formatPrice(order.totalCents)}</span>
        <span className={`rounded px-2 text-xs leading-5 font-medium ${STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
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
        <footer className="grid gap-4 border-t px-4 py-3 text-sm text-gray-700 sm:grid-cols-3">
          <div>
            <p className="font-medium">Shipping to</p>
            <p>
              {order.address.fullName}, {order.address.line1}, {order.address.city} {order.address.postalCode}, {order.address.country}
            </p>
          </div>
          <div>
            <p className="font-medium">Payment</p>
            <p>{order.payment ? `${BRAND_LABEL[order.payment.brand as CardBrand] ?? "Card"} •••• ${order.payment.last4}` : "—"}</p>
          </div>
          <dl>
            <div className="flex justify-between">
              <dt>Items</dt>
              <dd>{formatPrice(order.subtotalCents)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between">
                <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                <dd>−{formatPrice(order.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatPrice(order.totalCents)}</dd>
            </div>
          </dl>
        </footer>
      )}
    </article>
  );
}
