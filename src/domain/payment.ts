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

/** Accepted brands: exact digit count and how the number is grouped for display. */
const BRAND_RULES: Record<Exclude<CardBrand, "card">, { length: number; groups: number[] }> = {
  visa: { length: 16, groups: [4, 4, 4, 4] },
  mastercard: { length: 16, groups: [4, 4, 4, 4] },
  discover: { length: 16, groups: [4, 4, 4, 4] },
  amex: { length: 15, groups: [4, 6, 5] },
};
const DEFAULT_RULE = { length: 16, groups: [4, 4, 4, 4] };

function ruleFor(digits: string) {
  const brand = detectBrand(digits);
  return brand === "card" ? DEFAULT_RULE : BRAND_RULES[brand];
}

/**
 * Formats card-number input as the user types: keeps digits only, caps at the detected
 * brand's length (15 for Amex, else 16) and inserts spaces between groups
 * ("4242 4242 4242 4242", Amex "3782 822463 10005").
 */
export function formatCardNumber(raw: string): string {
  const all = raw.replace(/\D/g, "");
  const { length, groups } = ruleFor(all);
  const digits = all.slice(0, length);
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  return parts.join(" ");
}

/** User-facing problem with a card number, or null if it's acceptable. */
export function cardNumberProblem(raw: string): string | null {
  if (!/^[\d\s-]*$/.test(raw)) return "Card numbers contain digits only.";
  const digits = digitsOnly(raw);
  if (digits.length === 0) return "Enter your card number.";
  const brand = detectBrand(digits);
  if (brand === "card") return "We accept Visa, Mastercard, American Express and Discover.";
  const { length } = BRAND_RULES[brand];
  if (digits.length !== length) return `${BRAND_LABEL[brand]} numbers have ${length} digits.`;
  if (!luhnValid(digits)) return "That card number isn't valid. Check for typos.";
  return null;
}

/** Keeps only digits, at most `max` of them (for month/year inputs). */
export function digitsUpTo(raw: string, max: number): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/** A card is usable through the end of its expiry month. */
export function isExpired(expMonth: number, expYear: number, now: Date): boolean {
  const endOfMonth = new Date(Date.UTC(expYear, expMonth, 1)); // first day of the following month
  return now >= endOfMonth;
}

export const MAX_YEARS_AHEAD = 20;
const HOLDER_NAME = /^[\p{L}][\p{L} .'-]{1,59}$/u;

export type CardInput = { number: string; expMonth: number; expYear: number; holderName: string };
export type CardErrors = Partial<Record<keyof CardInput, string>>;

export function validateCard(input: CardInput, now: Date): CardErrors {
  const errors: CardErrors = {};
  const numberProblem = cardNumberProblem(input.number);
  if (numberProblem) errors.number = numberProblem;

  const monthOk = Number.isInteger(input.expMonth) && input.expMonth >= 1 && input.expMonth <= 12;
  const thisYear = now.getUTCFullYear();
  const yearOk = Number.isInteger(input.expYear) && input.expYear >= thisYear && input.expYear <= thisYear + MAX_YEARS_AHEAD;
  if (!monthOk) errors.expMonth = "Enter a month from 01 to 12.";
  if (!Number.isInteger(input.expYear) || input.expYear < 1000) errors.expYear = "Enter the 4-digit year.";
  else if (input.expYear < thisYear) errors.expYear = "This card has expired.";
  else if (!yearOk) errors.expYear = `Enter a year before ${thisYear + MAX_YEARS_AHEAD + 1}.`;
  if (monthOk && yearOk && isExpired(input.expMonth, input.expYear, now)) errors.expYear = "This card has expired.";

  if (!HOLDER_NAME.test(input.holderName.trim())) errors.holderName = "Enter the name as it appears on the card.";
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
