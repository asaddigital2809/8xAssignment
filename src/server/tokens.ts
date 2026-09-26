import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** 256-bit random, URL-safe token for emailed links. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is stored, so a database leak doesn't hand out working links. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
