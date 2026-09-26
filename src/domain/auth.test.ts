import { describe, expect, it } from "vitest";
import { isProtectedPath, normalizeEmail, passwordProblem, safeRedirectPath } from "./auth";

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Asad@Example.COM ")).toBe("asad@example.com");
  });
});

describe("passwordProblem", () => {
  it("enforces length and a letter + digit", () => {
    expect(passwordProblem("short1")).toMatch(/at least 8/);
    expect(passwordProblem("a".repeat(129) + "1")).toMatch(/at most/);
    expect(passwordProblem("onlyletters")).toMatch(/letter and one number/);
    expect(passwordProblem("12345678")).toMatch(/letter and one number/);
    expect(passwordProblem("goodpass1")).toBeNull();
  });
});

describe("safeRedirectPath", () => {
  it("keeps same-site relative paths", () => {
    expect(safeRedirectPath("/checkout?step=2")).toBe("/checkout?step=2");
  });

  it("rejects absolute, protocol-relative and malformed targets", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", "/a\nb", undefined, 42]) {
      expect(safeRedirectPath(bad)).toBe("/");
    }
  });
});

describe("isProtectedPath", () => {
  it("guards cart, checkout, orders, account and admin (and their children)", () => {
    for (const p of ["/cart", "/checkout", "/orders", "/orders/ORD-1", "/account", "/account/addresses", "/admin/dashboard"]) {
      expect(isProtectedPath(p)).toBe(true);
    }
  });

  it("leaves public pages alone, including look-alike prefixes", () => {
    for (const p of ["/", "/search", "/product/p1", "/signin", "/cartoons", "/administrator"]) {
      expect(isProtectedPath(p)).toBe(false);
    }
  });
});
