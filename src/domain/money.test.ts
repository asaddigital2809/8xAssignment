import { describe, expect, it } from "vitest";
import { estimatedDelivery, formatPrice, splitPrice } from "./money";

describe("prices", () => {
  it("formats cents as USD", () => {
    expect(formatPrice(109999)).toBe("$1,099.99");
  });

  it("splits for superscript display without float error", () => {
    expect(splitPrice(109999)).toEqual({ whole: "1,099", fraction: "99" });
    expect(splitPrice(1905)).toEqual({ whole: "19", fraction: "05" });
    expect(splitPrice(29)).toEqual({ whole: "0", fraction: "29" });
    expect(splitPrice(1000000)).toEqual({ whole: "10,000", fraction: "00" });
  });
});

describe("estimatedDelivery", () => {
  it("counts business days, skipping weekends", () => {
    // Thursday 2026-10-01 + 3 business days = Tuesday 2026-10-06
    const thu = new Date(2026, 9, 1, 12);
    expect(estimatedDelivery(thu, 3).toDateString()).toBe(new Date(2026, 9, 6, 12).toDateString());
    // Monday + 3 = Thursday
    expect(estimatedDelivery(new Date(2026, 9, 5, 12), 3).toDateString()).toBe(new Date(2026, 9, 8, 12).toDateString());
  });
});
