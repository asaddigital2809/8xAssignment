"use client";

import { useState } from "react";
import { returnRepository, type ReturnInput } from "@/data/returnRepository";
import type { ReturnReason } from "@/domain/returns";
import { attempt } from "./mutation";
import { useAsync } from "./useAsync";

export const useReturns = () => useAsync("returns", (signal) => returnRepository.list(signal));

export const useReturnOptions = (orderId: string) => useAsync(`return-options:${orderId}`, (signal) => returnRepository.options(orderId, signal));

/** Form state for a return request: per-item quantities, reason, comment. */
export function useReturnForm(orderId: string) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  /** Returns the created return request, or undefined (with `error` set) if it wasn't created. */
  async function submit() {
    const items = Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
    let problem: string | undefined;
    if (items.length === 0) problem = "Choose at least one item to return.";
    else if (!reason) problem = "Tell us why you're returning it.";
    if (problem || !reason) {
      setError(problem);
      return undefined;
    }

    setSubmitting(true);
    const input: ReturnInput = { items, reason, comment: comment.trim() || undefined };
    const result = await attempt(() => returnRepository.create(orderId, input));
    setSubmitting(false);
    setError(result.ok ? undefined : result.error);
    return result.ok ? result.data : undefined;
  }

  return {
    quantities,
    setQuantity: (productId: string, q: number) => setQuantities((s) => ({ ...s, [productId]: q })),
    reason,
    setReason,
    comment,
    setComment,
    error,
    submitting,
    submit,
  };
}
