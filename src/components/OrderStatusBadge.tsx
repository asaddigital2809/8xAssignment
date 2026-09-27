import { ORDER_STATUS_LABEL } from "@/domain/checkout";
import type { OrderStatus } from "@/domain/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-gray-200 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`rounded px-2 text-xs leading-5 font-medium whitespace-nowrap ${STATUS_STYLE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}
