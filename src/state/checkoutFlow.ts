"use client";

import { useState } from "react";
import { httpOrderRepository as orders } from "@/data/orderRepository";
import { useAddresses, usePaymentMethods } from "./accountData";
import { attempt } from "./mutation";
import { usePlaceOrder } from "./orders";
import { useAsync } from "./useAsync";

export const CHECKOUT_STEPS = ["address", "payment", "review"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/**
 * Multi-step checkout: address -> payment -> review -> place order.
 * Selections default to the user's default address/card. The review step's numbers are
 * a server quote; a coupon is only "applied" after the server accepts it.
 */
export function useCheckoutFlow() {
  const addressBook = useAddresses();
  const cards = usePaymentMethods();
  const placeOrder = usePlaceOrder();

  const [step, setStep] = useState<CheckoutStep>("address");
  const [chosenAddressId, setAddressId] = useState<string>();
  const [chosenCardId, setCardId] = useState<string>();
  const [appliedCoupon, setAppliedCoupon] = useState<string>();
  const [couponError, setCouponError] = useState<string>();
  const [applying, setApplying] = useState(false);

  // Derived selection: explicit choice if still present, else the default, else the first.
  const addressList = addressBook.state.status === "success" ? addressBook.state.data : [];
  const cardList = cards.state.status === "success" ? cards.state.data : [];
  const addressId = pick(addressList, chosenAddressId);
  const paymentMethodId = pick(cardList, chosenCardId);

  const quote = useAsync(`quote:${step === "review" ? (appliedCoupon ?? "") : "-"}`, (signal) =>
    step === "review" ? orders.quote(appliedCoupon, signal) : Promise.resolve(null),
  );

  async function applyCoupon(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    setApplying(true);
    const result = await attempt(() => orders.quote(trimmed));
    setApplying(false);
    if (!result.ok) return setCouponError(result.error);
    if (result.data.couponError) return setCouponError(result.data.couponError);
    setCouponError(undefined);
    setAppliedCoupon(result.data.coupon?.code);
  }

  function removeCoupon() {
    setAppliedCoupon(undefined);
    setCouponError(undefined);
  }

  return {
    step,
    goTo: setStep,
    addressBook,
    cards,
    addressId,
    paymentMethodId,
    selectAddress: setAddressId,
    selectCard: setCardId,
    canContinueFromAddress: Boolean(addressId),
    canContinueFromPayment: Boolean(paymentMethodId),
    quote,
    appliedCoupon,
    couponError,
    applying,
    applyCoupon,
    removeCoupon,
    placeOrder: placeOrder.state,
    submit: () =>
      addressId && paymentMethodId
        ? placeOrder.submit({ addressId, paymentMethodId, couponCode: appliedCoupon })
        : Promise.resolve(undefined),
  };
}

function pick<T extends { id: string; isDefault: boolean }>(list: T[], chosen: string | undefined): string | undefined {
  if (chosen && list.some((x) => x.id === chosen)) return chosen;
  return (list.find((x) => x.isDefault) ?? list[0])?.id;
}
