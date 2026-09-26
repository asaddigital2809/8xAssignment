"use client";

import { useState } from "react";
import { detectBrand, digitsUpTo, formatCardNumber, validateCard, type CardErrors, type CardInput } from "@/domain/payment";

type Fields = { number: string; expMonth: string; expYear: string; holderName: string };
const EMPTY: Fields = { number: "", expMonth: "", expYear: "", holderName: "" };

function normalize(field: keyof Fields, value: string): string {
  switch (field) {
    case "number":
      return formatCardNumber(value);
    case "expMonth":
      return digitsUpTo(value, 2);
    case "expYear":
      return digitsUpTo(value, 4);
    case "holderName":
      return value.slice(0, 60);
  }
}

/** Card entry form state. Same rules as the server (domain/payment), shown after the first submit. */
export function useCardForm() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const input: CardInput = {
    number: fields.number,
    expMonth: Number(fields.expMonth),
    expYear: Number(fields.expYear),
    holderName: fields.holderName,
  };
  const errors: CardErrors = submitted ? validateCard(input, new Date()) : {};

  return {
    fields,
    errors,
    /** Inputs are normalized as typed: grouped card digits, numeric month (2) and year (4). */
    setField: (field: keyof Fields, value: string) => setFields((f) => ({ ...f, [field]: normalize(field, value) })),
    brand: fields.number ? detectBrand(fields.number.replace(/\D/g, "")) : undefined,
    /** Marks submitted and returns the card only if it passes validation. */
    validate: (): CardInput | undefined => {
      setSubmitted(true);
      return Object.keys(validateCard(input, new Date())).length === 0 ? input : undefined;
    },
    reset: () => {
      setFields(EMPTY);
      setSubmitted(false);
    },
  };
}
