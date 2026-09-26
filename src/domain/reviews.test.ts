import { describe, expect, it } from "vitest";
import { reviewerDisplayName, summarizeRatings, validateReview } from "./reviews";
import { MAX_UPLOAD_BYTES, sniffImageType, uploadProblem } from "./uploads";

const input = (o = {}) => ({ rating: 5, title: "Great", body: "Works really well for me.", imageIds: [], ...o });

describe("validateReview", () => {
  it("accepts a normal review", () => {
    expect(validateReview(input())).toEqual({});
  });

  it("checks rating, body length, title length and photo count", () => {
    expect(validateReview(input({ rating: 0 })).rating).toBeDefined();
    expect(validateReview(input({ rating: 6 })).rating).toBeDefined();
    expect(validateReview(input({ rating: 4.5 })).rating).toBeDefined();
    expect(validateReview(input({ body: "  short   " })).body).toMatch(/at least 10/);
    expect(validateReview(input({ body: "x".repeat(2001) })).body).toMatch(/under 2000/);
    expect(validateReview(input({ title: "t".repeat(101) })).title).toBeDefined();
    expect(validateReview(input({ imageIds: ["a", "b", "c", "d"] })).imageIds).toMatch(/at most 3/);
    expect(validateReview(input({ imageIds: ["a", "a"] })).imageIds).toMatch(/twice/);
  });
});

describe("reviewerDisplayName", () => {
  it("shows first name + last initial, never more", () => {
    expect(reviewerDisplayName("Asad Ur Rehman Khan")).toBe("Asad K.");
    expect(reviewerDisplayName("Sam")).toBe("Sam");
    expect(reviewerDisplayName(null)).toBe("Customer");
    expect(reviewerDisplayName("   ")).toBe("Customer");
  });
});

describe("summarizeRatings", () => {
  it("averages to one decimal and counts per star", () => {
    expect(summarizeRatings([5, 4, 4])).toEqual({ average: 4.3, count: 3, distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 } });
    expect(summarizeRatings([]).average).toBe(0);
  });
});

describe("image uploads", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const html = new TextEncoder().encode("<html><script>alert(1)</script>");
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');

  it("identifies images by their bytes", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(jpeg)).toBe("image/jpeg");
    expect(sniffImageType(webp)).toBe("image/webp");
  });

  it("rejects non-images (HTML, SVG), empty and oversized files", () => {
    expect(uploadProblem(html)).toMatch(/Only JPEG, PNG or WebP/);
    expect(uploadProblem(svg)).toMatch(/Only JPEG, PNG or WebP/);
    expect(uploadProblem(new Uint8Array())).toMatch(/empty/);
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(png);
    expect(uploadProblem(big)).toMatch(/2 MB/);
    expect(uploadProblem(png)).toBeNull();
  });
});
