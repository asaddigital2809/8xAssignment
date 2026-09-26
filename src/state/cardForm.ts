"use client";

import { useState } from "react";
import { validateCard, type CardErrors, type CardInput } from "@/domain/payment";

type Fields = { number: string; expMonth: string; expYear: string; holderName: string };
const EMPTY: Fields = { number: "", expMonth: "", expYear: "", holderName: "" };

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
    setField: (field: keyof Fields, value: string) => setFields((f) => ({ ...f, [field]: value })),
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
