"use client";

import type { AddressErrors } from "@/domain/checkout";
import type { Address } from "@/domain/types";

const FIELDS: { name: keyof Address; label: string; autoComplete: string; wide?: boolean }[] = [
  { name: "fullName", label: "Full name", autoComplete: "name" },
  { name: "line1", label: "Street address", autoComplete: "address-line1", wide: true },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "postalCode", label: "Postal code", autoComplete: "postal-code" },
  { name: "country", label: "Country", autoComplete: "country-name" },
];

/** Controlled address inputs; state and validation live in useAddressForm. */
export function AddressFields({
  address,
  errors,
  onChange,
}: {
  address: Address;
  errors: AddressErrors;
  onChange: (field: keyof Address, value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FIELDS.map((f) => (
        <label key={f.name} className={`text-sm ${f.wide ? "sm:col-span-2" : ""}`}>
          {f.label}
          <input
            name={f.name}
            value={address[f.name]}
            onChange={(e) => onChange(f.name, e.target.value)}
            autoComplete={f.autoComplete}
            aria-invalid={Boolean(errors[f.name])}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 aria-[invalid=true]:border-red-500"
          />
          {errors[f.name] && <span className="text-xs text-red-700">{errors[f.name]}</span>}
        </label>
      ))}
    </div>
  );
}

export function formatAddress(a: Address): string {
  return `${a.fullName}, ${a.line1}, ${a.city} ${a.postalCode}, ${a.country}`;
}
