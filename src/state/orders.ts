"use client";

import { useState } from "react";
import { HttpError, UnauthorizedError } from "@/data/http";
import { httpOrderRepository as orders, type CheckoutSelection } from "@/data/orderRepository";
import type { Order, OrderStatus } from "@/domain/types";
import { useCartStore } from "./cartStore";
import { redirectToSignIn } from "./navigation";
import { useAsync } from "./useAsync";

export const useOrders = (status?: OrderStatus) => useAsync(`orders:${status ?? "all"}`, (signal) => orders.list(status, signal));

export const useOrder = (id: string) => useAsync(`order:${id}`, (signal) => orders.getById(id, signal));

type PlaceOrderState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "placed"; order: Order }
  | { status: "error"; message: string };

/**
 * Places the order (create, then mock-pay) from the server-side cart.
 *
 * One idempotency key per checkout visit: retrying after a failure or a lost response
 * returns the same order rather than creating another. If "pay" answers 409 because an
 * earlier attempt already went through (response lost), the order is re-read and treated
 * as paid instead of showing a false error.
 */
export function usePlaceOrder() {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, setState] = useState<PlaceOrderState>({ status: "idle" });

  async function submit(selection: CheckoutSelection): Promise<Order | undefined> {
    setState({ status: "submitting" });
    try {
      const pending = await orders.create(selection, idempotencyKey);
      const paid = pending.status === "pending_payment" ? await payOrReconcile(pending.id) : pending;
      setState({ status: "placed", order: paid });
      void useCartStore.getState().load(); // server emptied the cart
      return paid;
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        redirectToSignIn("/checkout");
        return undefined;
      }
      setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      void useCartStore.getState().load(); // cart may have changed (e.g. order created, payment failed)
      return undefined;
    }
  }

  return { state, submit };
}

async function payOrReconcile(orderId: string): Promise<Order> {
  try {
    return await orders.pay(orderId);
  } catch (err) {
    if (err instanceof HttpError && err.status === 409) {
      const current = await orders.getById(orderId);
      if (current.status !== "pending_payment") return current;
    }
    throw err;
  }
}
