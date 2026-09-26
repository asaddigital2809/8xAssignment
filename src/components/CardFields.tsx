"use client";

import { BRAND_LABEL, type CardBrand, type CardErrors, type PaymentMethod } from "@/domain/payment";

type Fields = { number: string; expMonth: string; expYear: string; holderName: string };

/** Controlled card inputs; state and validation live in useCardForm. No CVC: this is a mock. */
export function CardFields({
  fields,
  errors,
  brand,
  onChange,
}: {
  fields: Fields;
  errors: CardErrors;
  /** Detected from the digits typed so far. */
  brand?: CardBrand;
  onChange: (field: keyof Fields, value: string) => void;
}) {
  const input = "mt-1 block w-full rounded border border-gray-300 px-3 py-2 aria-[invalid=true]:border-red-500";
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <label className="text-sm sm:col-span-4">
        <span className="flex justify-between">
          Card number
          {brand && brand !== "card" && <span className="text-xs font-medium text-gray-600">{BRAND_LABEL[brand]}</span>}
        </span>
        <input
          name="cardNumber"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          maxLength={19}
          value={fields.number}
          onChange={(e) => onChange("number", e.target.value)}
          aria-invalid={Boolean(errors.number)}
          className={input}
        />
        {errors.number && <span className="text-xs text-red-700">{errors.number}</span>}
      </label>
      <label className="text-sm">
        Month
        <input
          name="expMonth"
          inputMode="numeric"
          autoComplete="cc-exp-month"
          placeholder="MM"
          maxLength={2}
          value={fields.expMonth}
          onChange={(e) => onChange("expMonth", e.target.value)}
          aria-invalid={Boolean(errors.expMonth)}
          className={input}
        />
        {errors.expMonth && <span className="text-xs text-red-700">{errors.expMonth}</span>}
      </label>
      <label className="text-sm">
        Year
        <input
          name="expYear"
          inputMode="numeric"
          autoComplete="cc-exp-year"
          placeholder="YYYY"
          maxLength={4}
          value={fields.expYear}
          onChange={(e) => onChange("expYear", e.target.value)}
          aria-invalid={Boolean(errors.expYear)}
          className={input}
        />
        {errors.expYear && <span className="text-xs text-red-700">{errors.expYear}</span>}
      </label>
      <label className="text-sm sm:col-span-2">
        Name on card
        <input
          name="holderName"
          autoComplete="cc-name"
          value={fields.holderName}
          onChange={(e) => onChange("holderName", e.target.value)}
          aria-invalid={Boolean(errors.holderName)}
          className={input}
        />
        {errors.holderName && <span className="text-xs text-red-700">{errors.holderName}</span>}
      </label>
      <p className="text-xs text-gray-500 sm:col-span-4">
        Payments are simulated. Only the card brand, last 4 digits and expiry are stored. Try 4242 4242 4242 4242.
      </p>
    </div>
  );
}

export function cardLabel(c: Pick<PaymentMethod, "brand" | "last4" | "expMonth" | "expYear">): string {
  return `${BRAND_LABEL[c.brand]} •••• ${c.last4}, expires ${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}`;
}
