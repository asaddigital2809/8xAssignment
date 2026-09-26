import { describe, expect, it } from "vitest";
import { escapeLike, MAX_QUERY_LENGTH, MAX_TERMS, sanitizeQuery } from "./search";

describe("sanitizeQuery", () => {
  it("lower-cases, splits and de-duplicates terms", () => {
    expect(sanitizeQuery({ text: "  Apple  iPhone apple " }).terms).toEqual(["apple", "iphone"]);
  });

  it("strips control characters and caps length and term count", () => {
    expect(sanitizeQuery({ text: "a\u0000b" }).terms).toEqual(["a", "b"]);
    expect(sanitizeQuery({ text: "x".repeat(500) }).terms[0]).toHaveLength(MAX_QUERY_LENGTH);
    expect(sanitizeQuery({ text: "a b c d e f g h i j k" }).terms).toHaveLength(MAX_TERMS);
  });

  it("accepts slug categories and rejects anything else", () => {
    expect(sanitizeQuery({ categoryId: "smartphones" }).categoryId).toBe("smartphones");
    expect(sanitizeQuery({ categoryId: "" }).categoryId).toBeUndefined();
    expect(sanitizeQuery({ categoryId: "x' OR 1=1 --" }).categoryId).toBeNull();
  });
});

describe("escapeLike", () => {
  it("makes wildcards literal", () => {
    // Input: 50%_off\   Expected: 50\%\_off\\
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});
