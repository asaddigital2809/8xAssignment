"use client";

import { useState } from "react";
import { localOrderRepository as orders } from "@/data/orderRepository";
import type { Address, Order } from "@/domain/types";
import { placeOrder } from "@/services/checkoutService";
import { useCartStore } from "./cartStore";
import { useAsync } from "./useAsync";

export const useOrders = () => useAsync("orders", () => orders.list());

export const useOrder = (id: string) =>
  useAsync(`order:${id}`, async () => {
    const order = await orders.getById(id);
    if (!order) throw new Error("We couldn't find that order.");
    return order;
  });

type PlaceOrderState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "placed"; order: Order }
  | { status: "error"; message: string };

/** Places an order from the current cart and clears the cart only once the order is saved. */
export function usePlaceOrder() {
  const [state, setState] = useState<PlaceOrderState>({ status: "idle" });

  async function submit(address: Address): Promise<Order | undefined> {
    setState({ status: "submitting" });
    try {
      const order = await placeOrder(useCartStore.getState().items, address);
      setState({ status: "placed", order });
      useCartStore.getState().clear();
      return order;
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      return undefined;
    }
  }

  return { state, submit };
}
