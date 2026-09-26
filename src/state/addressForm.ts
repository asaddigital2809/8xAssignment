"use client";

import { useState } from "react";
import { EMPTY_ADDRESS, isValid, validateAddress, type AddressErrors } from "@/domain/checkout";
import type { Address } from "@/domain/types";

/** Form state for an address (new or edited); errors only show after the first submit attempt. */
export function useAddressForm(initial: Address = EMPTY_ADDRESS) {
  const [address, setAddress] = useState<Address>(initial);
  const [submitted, setSubmitted] = useState(false);

  const errors: AddressErrors = submitted ? validateAddress(address) : {};

  function setField(field: keyof Address, value: string) {
    setAddress((a) => ({ ...a, [field]: value }));
  }

  /** Marks the form as submitted and returns the address only if it's valid. */
  function validate(): Address | undefined {
    setSubmitted(true);
    return isValid(validateAddress(address)) ? address : undefined;
  }

  function reset(next: Address = EMPTY_ADDRESS) {
    setAddress(next);
    setSubmitted(false);
  }

  return { address, errors, setField, validate, reset };
}
