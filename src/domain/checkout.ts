import type { Address, OrderStatus } from "./types";

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

/** A business-rule failure the user can act on (shown as-is; HTTP 409/422). */
export class CheckoutError extends Error {}

/**
 * A cart line priced from the database at the moment of checkout. The client never
 * supplies any of these numbers; they come from `products` inside the order transaction.
 */
export type PricedLine = {
  productId: string;
  title: string;
  thumbnail: string;
  unitPriceCents: number;
  quantity: number;
  stock: number;
};

export type OrderDraft = {
  lines: Omit<PricedLine, "stock">[];
  address: Address;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
};

export function subtotalOf(lines: Pick<PricedLine, "unitPriceCents" | "quantity">[]): number {
  return lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}

/** Titles of lines that ask for more than is in stock. */
export function stockShortfalls(lines: PricedLine[]): string[] {
  return lines.filter((l) => l.quantity > l.stock).map((l) => l.title);
}

/** Validates and prices an order from server-side data. Throws CheckoutError for user-fixable problems. */
export function buildOrderDraft(lines: PricedLine[], address: Address): OrderDraft {
  if (lines.length === 0) throw new CheckoutError("Your cart is empty.");
  if (!isValid(validateAddress(address))) throw new CheckoutError("The shipping address is incomplete.");
  const short = stockShortfalls(lines);
  if (short.length > 0) throw new CheckoutError(`Not enough stock for: ${short.join(", ")}. Update your cart and try again.`);

  const subtotalCents = subtotalOf(lines);
  const discountCents = 0; // coupons: step 4
  return {
    lines: lines.map(({ productId, title, thumbnail, unitPriceCents, quantity }) => ({
      productId,
      title,
      thumbnail,
      unitPriceCents,
      quantity,
    })),
    address: trimAddress(address),
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
  };
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Only a pending order can be paid; anything else is a repeat or a stale request. */
export function canPay(status: OrderStatus): boolean {
  return status === "pending_payment";
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
