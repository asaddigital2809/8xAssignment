import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * TEMPORARY test mode: when DEV_FIXED_OTP is set (e.g. "123456"), no email is sent and
 * account activation / password reset accept that fixed code instead of an emailed link.
 *
 * This is deliberately insecure: anyone who knows an address can reset its password.
 * It exists only because SMTP isn't set up on the deployment yet. Unset DEV_FIXED_OTP
 * (and configure SMTP_*) to go back to single-use emailed links.
 */
export function devOtpEnabled(): boolean {
  return Boolean(process.env.DEV_FIXED_OTP);
}

export function devOtpCode(): string | undefined {
  return process.env.DEV_FIXED_OTP || undefined;
}

export function matchesDevOtp(code: string): boolean {
  const expected = process.env.DEV_FIXED_OTP;
  if (!expected) return false;
  const a = Buffer.from(code.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
