import { describe, expect, it } from "vitest";
import { cardNumberProblem, detectBrand, digitsUpTo, formatCardNumber, isExpired, luhnValid, toStoredCard, validateCard } from "./payment";

const now = new Date("2026-09-27T12:00:00Z");
const card = (o: Partial<Parameters<typeof validateCard>[0]> = {}) => ({
  number: "4242 4242 4242 4242",
  expMonth: 12,
  expYear: 2030,
  holderName: "Sam Shopper",
  ...o,
});

describe("card number rules", () => {
  it("checks the Luhn checksum", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
  });

  it("detects brands", () => {
    expect(detectBrand("4242424242424242")).toBe("visa");
    expect(detectBrand("5555555555554444")).toBe("mastercard");
    expect(detectBrand("2223003122003222")).toBe("mastercard");
    expect(detectBrand("378282246310005")).toBe("amex");
    expect(detectBrand("6011111111111117")).toBe("discover");
  });

  it("requires the exact length for the brand", () => {
    expect(cardNumberProblem("4242 4242 4242 4242")).toBeNull();
    expect(cardNumberProblem("4242 4242 4242 4242 4")).toMatch(/Visa numbers have 16 digits/);
    expect(cardNumberProblem("4242 4242 4242 424")).toMatch(/16 digits/);
    expect(cardNumberProblem("378282246310005")).toBeNull();
    expect(cardNumberProblem("3782822463100051")).toMatch(/American Express numbers have 15 digits/);
  });

  it("rejects other characters, unknown brands, empty and bad checksums", () => {
    expect(cardNumberProblem("4242abcd42424242")).toMatch(/digits only/);
    expect(cardNumberProblem("9999 9999 9999 9995")).toMatch(/We accept/);
    expect(cardNumberProblem("")).toMatch(/Enter your card number/);
    expect(cardNumberProblem("4242 4242 4242 4241")).toMatch(/isn't valid/);
  });
});

describe("formatCardNumber (as you type)", () => {
  it("groups in fours and caps at 16 digits", () => {
    expect(formatCardNumber("4242")).toBe("4242");
    expect(formatCardNumber("42424")).toBe("4242 4");
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("42424242424242429999")).toBe("4242 4242 4242 4242");
  });

  it("uses 4-6-5 and 15 digits for Amex", () => {
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(formatCardNumber("3782822463100059")).toBe("3782 822463 10005");
  });

  it("drops anything that isn't a digit (including pasted separators)", () => {
    expect(formatCardNumber("4242-4242 abc 4242.4242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("   ")).toBe("");
  });

  it("digitsUpTo keeps month/year inputs numeric and short", () => {
    expect(digitsUpTo("1a2b3", 2)).toBe("12");
    expect(digitsUpTo("20300", 4)).toBe("2030");
  });
});

describe("validateCard", () => {
  it("accepts a good card", () => {
    expect(validateCard(card(), now)).toEqual({});
  });

  it("validates month, year range and expiry independently", () => {
    expect(validateCard(card({ expMonth: 13 }), now).expMonth).toMatch(/01 to 12/);
    expect(validateCard(card({ expMonth: 0, expYear: 2020 }), now)).toMatchObject({ expMonth: expect.any(String), expYear: expect.stringMatching(/expired/) });
    expect(validateCard(card({ expYear: 30 }), now).expYear).toMatch(/4-digit/);
    expect(validateCard(card({ expYear: 2099 }), now).expYear).toMatch(/before 2047/);
    expect(validateCard(card({ expMonth: 8, expYear: 2026 }), now).expYear).toMatch(/expired/);
    expect(validateCard(card({ expMonth: 9, expYear: 2026 }), now)).toEqual({});
  });

  it("validates the holder name", () => {
    expect(validateCard(card({ holderName: "" }), now).holderName).toBeDefined();
    expect(validateCard(card({ holderName: "<script>" }), now).holderName).toBeDefined();
    expect(validateCard(card({ holderName: "José O'Neil-Smith Jr." }), now)).toEqual({});
  });

  it("treats a card as valid through the end of its expiry month", () => {
    expect(isExpired(9, 2026, now)).toBe(false);
    expect(isExpired(8, 2026, now)).toBe(true);
    expect(isExpired(12, 2026, new Date("2026-12-31T23:59:59Z"))).toBe(false);
  });
});

describe("toStoredCard", () => {
  it("stores only brand, last4 and expiry, never the full number", () => {
    const stored = toStoredCard({ number: "4242-4242-4242-4242", expMonth: 12, expYear: 2030, holderName: " Sam " });
    expect(stored).toEqual({ brand: "visa", last4: "4242", expMonth: 12, expYear: 2030, holderName: "Sam" });
    expect(JSON.stringify(stored)).not.toContain("42424242");
  });
});
