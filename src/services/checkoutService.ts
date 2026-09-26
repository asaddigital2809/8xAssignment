import { buildOrder } from "@/domain/checkout";
import type { Address, CartItem, Order } from "@/domain/types";
import { localOrderRepository, type OrderRepository } from "@/data/orderRepository";

function newOrderId(): string {
  return `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function placeOrder(
  items: CartItem[],
  address: Address,
  orders: OrderRepository = localOrderRepository,
): Promise<Order> {
  const order = buildOrder(items, address, new Date(), newOrderId());
  return orders.create(order);
}
