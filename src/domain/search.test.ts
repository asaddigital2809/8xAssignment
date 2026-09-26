import { describe, expect, it } from "vitest";
import { matchesQuery } from "./search";
import type { Product } from "./types";

const phone: Product = {
  id: "p1",
  title: "iPhone 9",
  description: "An apple mobile",
  categoryId: "smartphones",
  brand: "Apple",
  priceCents: 54900,
  rating: 4.7,
  stock: 10,
  thumbnail: "",
  images: [],
};

describe("matchesQuery", () => {
  it("matches every term case-insensitively across title, brand, description and category", () => {
    expect(matchesQuery(phone, { text: "APPLE iphone" })).toBe(true);
    expect(matchesQuery(phone, { text: "phones" }, "Smartphones")).toBe(true);
    expect(matchesQuery(phone, { text: "apple laptop" })).toBe(false);
  });

  it("applies the category filter", () => {
    expect(matchesQuery(phone, { categoryId: "laptops" })).toBe(false);
    expect(matchesQuery(phone, { text: "", categoryId: "smartphones" })).toBe(true);
  });
});
