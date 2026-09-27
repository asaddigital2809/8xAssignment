import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/domain/auth";

// Auth.js session cookie: "authjs.session-token", "__Secure-" prefixed on HTTPS, and
// split into ".0", ".1"... chunks if it ever grows large.
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

/**
 * Optimistic redirects only: checks whether a session cookie is present, never the
 * database. The real checks live in server/dal.ts and run on every protected page,
 * action and route.
 *
 * Deliberately NOT wrapped in Auth.js's auth(): that wrapper re-issues (rolls) the
 * session cookie on every response. A request already in flight when the user signs out
 * would then come back after the sign-out and set the old cookie again, silently
 * signing the user back in (reproduced with hover prefetches). Here the proxy never
 * writes cookies; only sign-in and sign-out do.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.getAll().some((c) => SESSION_COOKIE.test(c.name) && c.value);

  if (!hasSession && isProtectedPath(pathname)) {
    const url = new URL("/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  // Signed-in users are NOT bounced away from /signin here: a cookie can outlive a
  // session the DAL has revoked (e.g. after a password reset), and redirecting on the
  // cookie alone would lock that user out. The sign-in page checks the DAL instead.
  return NextResponse.next();
}

export const config = {
  // Skip static assets, images and the auth endpoints themselves.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
