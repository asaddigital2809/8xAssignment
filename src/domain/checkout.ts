import { cartSubtotal } from "./cart";
import type { Address, CartItem, Order } from "./types";

export type AddressErrors = Partial<Record<keyof Address, string>>;

export const EMPTY_ADDRESS: Address = {
  fullName: "",
  line1: "",
  city: "",
  postalCode: "",
  country: "",
};

export function validateAddress(address: Address): AddressErrors {
  const errors: AddressErrors = {};
  if (address.fullName.trim().length < 2) errors.fullName = "Enter your full name.";
  if (address.line1.trim().length < 3) errors.line1 = "Enter a street address.";
  if (address.city.trim().length < 2) errors.city = "Enter a city.";
  if (!/^[A-Za-z0-9 -]{3,10}$/.test(address.postalCode.trim())) errors.postalCode = "Enter a valid postal code.";
  if (address.country.trim().length < 2) errors.country = "Enter a country.";
  return errors;
}

export function isValid(errors: AddressErrors): boolean {
  return Object.keys(errors).length === 0;
}

export class CheckoutError extends Error {}

/** Builds an immutable order snapshot from the cart. Throws if the order can't be placed. */
export function buildOrder(items: CartItem[], address: Address, now: Date, id: string): Order {
  if (items.length === 0) throw new CheckoutError("Your cart is empty.");
  if (!isValid(validateAddress(address))) throw new CheckoutError("The shipping address is incomplete.");

  return {
    id,
    placedAt: now.toISOString(),
    address: trimAddress(address),
    subtotalCents: cartSubtotal(items),
    lines: items.map(({ productId, title, priceCents, thumbnail, quantity }) => ({
      productId,
      title,
      priceCents,
      thumbnail,
      quantity,
    })),
  };
}

function trimAddress(a: Address): Address {
  return {
    fullName: a.fullName.trim(),
    line1: a.line1.trim(),
    city: a.city.trim(),
    postalCode: a.postalCode.trim(),
    country: a.country.trim(),
  };
}
