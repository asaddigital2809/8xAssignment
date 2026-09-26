import { describe, expect, it } from "vitest";
import { detectBrand, isExpired, luhnValid, toStoredCard, validateCard } from "./payment";

const now = new Date("2026-09-27T12:00:00Z");

describe("card validation", () => {
  it("checks the Luhn checksum", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
    expect(luhnValid("42424242")).toBe(false);
    expect(luhnValid("4242abcd42424242")).toBe(false);
  });

  it("detects brands", () => {
    expect(detectBrand("4242424242424242")).toBe("visa");
    expect(detectBrand("5555555555554444")).toBe("mastercard");
    expect(detectBrand("2223003122003222")).toBe("mastercard");
    expect(detectBrand("378282246310005")).toBe("amex");
    expect(detectBrand("6011111111111117")).toBe("discover");
  });

  it("treats a card as valid through the end of its expiry month", () => {
    expect(isExpired(9, 2026, now)).toBe(false);
    expect(isExpired(8, 2026, now)).toBe(true);
    expect(isExpired(12, 2026, new Date("2026-12-31T23:59:59Z"))).toBe(false);
  });

  it("reports field errors", () => {
    expect(validateCard({ number: "4242 4242 4242 4242", expMonth: 12, expYear: 2030, holderName: "Sam" }, now)).toEqual({});
    const errs = validateCard({ number: "1234", expMonth: 13, expYear: 2030, holderName: "" }, now);
    expect(Object.keys(errs).sort()).toEqual(["expMonth", "holderName", "number"]);
    expect(validateCard({ number: "4242424242424242", expMonth: 1, expYear: 2020, holderName: "Sam" }, now).expYear).toMatch(/expired/);
  });

  it("stores only brand, last4 and expiry, never the full number", () => {
    const stored = toStoredCard({ number: "4242-4242-4242-4242", expMonth: 12, expYear: 2030, holderName: " Sam " });
    expect(stored).toEqual({ brand: "visa", last4: "4242", expMonth: 12, expYear: 2030, holderName: "Sam" });
    expect(JSON.stringify(stored)).not.toContain("42424242");
  });
});
