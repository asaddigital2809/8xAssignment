import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { generateToken, hashToken } from "./tokens";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse 1");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse 1", hash)).toBe(true);
    expect(await verifyPassword("correct horse 2", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same-pass1")).not.toBe(await hashPassword("same-pass1"));
  });

  it("rejects malformed stored values instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
});

describe("tokens", () => {
  it("are random and stored only as a hash", () => {
    const a = generateToken();
    expect(a).not.toBe(generateToken());
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).toBe(hashToken(a));
  });
});
