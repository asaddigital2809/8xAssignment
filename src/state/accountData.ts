"use client";

import { addressRepository, paymentMethodRepository } from "@/data/accountRepository";
import type { CardInput } from "@/domain/payment";
import type { Address } from "@/domain/types";
import { attempt } from "./mutation";
import { useAsync } from "./useAsync";

/** The user's address book with mutations that keep the list in sync with the server's answer. */
export function useAddresses() {
  const { state, retry, replace } = useAsync("addresses", (signal) => addressRepository.list(signal));

  return {
    state,
    retry,
    create: async (input: Address, makeDefault = false) => {
      const result = await attempt(() => addressRepository.create(input, makeDefault));
      if (result.ok) retry(); // defaults may have moved
      return result;
    },
    update: async (id: string, input: Address) => {
      const result = await attempt(() => addressRepository.update(id, input));
      if (result.ok) retry();
      return result;
    },
    remove: async (id: string) => {
      const result = await attempt(() => addressRepository.remove(id));
      if (result.ok) replace(result.data);
      return result;
    },
    setDefault: async (id: string) => {
      const result = await attempt(() => addressRepository.setDefault(id));
      if (result.ok) replace(result.data);
      return result;
    },
  };
}

export function usePaymentMethods() {
  const { state, retry, replace } = useAsync("payment-methods", (signal) => paymentMethodRepository.list(signal));

  return {
    state,
    retry,
    create: async (input: CardInput, makeDefault = false) => {
      const result = await attempt(() => paymentMethodRepository.create(input, makeDefault));
      if (result.ok) retry();
      return result;
    },
    remove: async (id: string) => {
      const result = await attempt(() => paymentMethodRepository.remove(id));
      if (result.ok) replace(result.data);
      return result;
    },
    setDefault: async (id: string) => {
      const result = await attempt(() => paymentMethodRepository.setDefault(id));
      if (result.ok) replace(result.data);
      return result;
    },
  };
}
