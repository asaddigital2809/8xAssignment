export type Role = "user" | "admin";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
};

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Emails are stored and compared lower-cased and trimmed. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Returns a user-facing problem with the password, or null if it's acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Use at least one letter and one number.";
  return null;
}

/**
 * Only same-site relative paths are allowed as post-login destinations, so a crafted
 * `callbackUrl` can't bounce a user to another site (open redirect).
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

/** Paths that require a signed-in user. Shared by the proxy (redirects) and tests. */
export const PROTECTED_PREFIXES = ["/cart", "/checkout", "/orders", "/account", "/admin"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
