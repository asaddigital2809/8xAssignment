export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "card";

/** What we keep about a card. The full number never reaches storage. */
export type PaymentMethod = {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  isDefault: boolean;
};

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  card: "Card",
};

export function digitsOnly(input: string): string {
  return input.replace(/[\s-]/g, "");
}

/** Luhn checksum (catches typos; this is a mock, nothing is charged). */
export function luhnValid(number: string): boolean {
  if (!/^\d{12,19}$/.test(number)) return false;
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = Number(number[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectBrand(number: string): CardBrand {
  if (/^4/.test(number)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(number)) return "mastercard";
  if (/^3[47]/.test(number)) return "amex";
  if (/^6(011|5)/.test(number)) return "discover";
  return "card";
}

/** A card is usable through the end of its expiry month. */
export function isExpired(expMonth: number, expYear: number, now: Date): boolean {
  const endOfMonth = new Date(Date.UTC(expYear, expMonth, 1)); // first day of the following month
  return now >= endOfMonth;
}

export type CardInput = { number: string; expMonth: number; expYear: number; holderName: string };
export type CardErrors = Partial<Record<keyof CardInput, string>>;

export function validateCard(input: CardInput, now: Date): CardErrors {
  const errors: CardErrors = {};
  const number = digitsOnly(input.number);
  if (!luhnValid(number)) errors.number = "Enter a valid card number.";
  if (!Number.isInteger(input.expMonth) || input.expMonth < 1 || input.expMonth > 12) errors.expMonth = "Enter a valid month.";
  else if (!Number.isInteger(input.expYear) || input.expYear < 2000 || input.expYear > 2100) errors.expYear = "Enter a valid year.";
  else if (isExpired(input.expMonth, input.expYear, now)) errors.expYear = "This card has expired.";
  if (input.holderName.trim().length < 2) errors.holderName = "Enter the name on the card.";
  return errors;
}

/** Reduces a validated card to what may be stored. */
export function toStoredCard(input: CardInput): Omit<PaymentMethod, "id" | "isDefault"> {
  const number = digitsOnly(input.number);
  return {
    brand: detectBrand(number),
    last4: number.slice(-4),
    expMonth: input.expMonth,
    expYear: input.expYear,
    holderName: input.holderName.trim(),
  };
}
