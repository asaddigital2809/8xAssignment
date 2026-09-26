import "server-only";
import { headers } from "next/headers";

/**
 * Origin used in emailed links. Production must set APP_URL: deriving it from the
 * request's Host header would let an attacker poison reset links sent to a victim.
 */
export async function getAppOrigin(): Promise<string> {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL is not set.");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}
