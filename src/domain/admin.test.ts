import { describe, expect, it } from "vitest";
import {
  canTransitionOrder,
  canTransitionReturn,
  isAllowedImageUrl,
  parseMoneyToCents,
  slugify,
  validateCategory,
  validateCoupon,
  validateProduct,
  type CouponInput,
  type ProductInput,
} from "./admin";

describe("order transitions", () => {
  it("allows the forward path and cancellation before shipping", () => {
    expect(canTransitionOrder("paid", "shipped")).toBe(true);
    expect(canTransitionOrder("shipped", "delivered")).toBe(true);
    expect(canTransitionOrder("pending_payment", "cancelled")).toBe(true);
    expect(canTransitionOrder("paid", "cancelled")).toBe(true);
  });

  it("refuses skipping, going back, admin-set 'paid' and leaving final states", () => {
    expect(canTransitionOrder("paid", "delivered")).toBe(false);
    expect(canTransitionOrder("shipped", "paid")).toBe(false);
    expect(canTransitionOrder("pending_payment", "paid")).toBe(false);
    expect(canTransitionOrder("shipped", "cancelled")).toBe(false);
    expect(canTransitionOrder("delivered", "cancelled")).toBe(false);
    expect(canTransitionOrder("cancelled", "paid")).toBe(false);
  });

  it("returns: requested -> approved/rejected, approved -> refunded", () => {
    expect(canTransitionReturn("requested", "approved")).toBe(true);
    expect(canTransitionReturn("approved", "refunded")).toBe(true);
    expect(canTransitionReturn("requested", "refunded")).toBe(false);
    expect(canTransitionReturn("rejected", "approved")).toBe(false);
  });
});

describe("parseMoneyToCents", () => {
  it("parses common formats exactly (no float error)", () => {
    expect(parseMoneyToCents("12")).toBe(1200);
    expect(parseMoneyToCents("12.5")).toBe(1250);
    expect(parseMoneyToCents("0.29")).toBe(29);
    expect(parseMoneyToCents("$1,299.99")).toBe(129999);
  });

  it("rejects junk", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e3", "12.", "Infinity"]) expect(parseMoneyToCents(bad)).toBeNull();
  });
});

describe("slugify", () => {
  it("makes url-safe ids", () => {
    expect(slugify("Home & Garden!")).toBe("home-garden");
    expect(slugify("  Café Décor ")).toBe("cafe-decor");
    expect(slugify("!!!")).toBe("");
  });
});

describe("validators", () => {
  const product: ProductInput = {
    title: "Desk Lamp",
    description: "A bright LED desk lamp.",
    categoryId: "home-decoration",
    brand: "Lumo",
    priceCents: 2999,
    stock: 10,
    images: ["/api/images/115e7223-ca1e-4902-8920-17ec15fee29c"],
  };

  it("product: accepts good input, rejects bad fields and foreign image urls", () => {
    expect(validateProduct(product)).toEqual({});
    expect(Object.keys(validateProduct({ ...product, title: "", priceCents: 0, stock: -1, images: [] })).sort()).toEqual(["images", "priceCents", "stock", "title"]);
    expect(validateProduct({ ...product, images: ["https://evil.example/x.png"] }).images).toBeDefined();
    expect(validateProduct({ ...product, images: ["javascript:alert(1)"] }).images).toBeDefined();
  });

  it("image urls: only our uploads or the catalog CDN", () => {
    expect(isAllowedImageUrl("https://cdn.dummyjson.com/product-images/a/b.webp")).toBe(true);
    expect(isAllowedImageUrl("https://cdn.dummyjson.com.evil.com/x.png")).toBe(false);
    expect(isAllowedImageUrl("/api/images/../../etc")).toBe(false);
  });

  it("category", () => {
    const img = "/api/images/115e7223-ca1e-4902-8920-17ec15fee29c";
    expect(validateCategory({ name: "Garden", image: img })).toEqual({});
    expect(validateCategory({ name: "!!", image: img }).name).toBeDefined();
    expect(validateCategory({ name: "Garden", image: "" }).image).toBeDefined();
  });

  it("coupon", () => {
    const c: CouponInput = { code: "SUMMER10", kind: "percent", value: 10, minSubtotalCents: 0, maxDiscountCents: null, startsAt: null, expiresAt: null, usageLimit: null, oncePerUser: false, active: true };
    expect(validateCoupon(c)).toEqual({});
    expect(validateCoupon({ ...c, value: 150 }).value).toBeDefined();
    expect(validateCoupon({ ...c, code: "no spaces" }).code).toBeDefined();
    expect(validateCoupon({ ...c, startsAt: new Date("2026-10-02"), expiresAt: new Date("2026-10-01") }).expiresAt).toBeDefined();
    expect(validateCoupon({ ...c, usageLimit: 0 }).usageLimit).toBeDefined();
  });
});
