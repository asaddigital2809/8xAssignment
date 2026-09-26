import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isProtectedPath } from "@/domain/auth";

/**
 * Optimistic redirects only: reads the session cookie, never the database. The real
 * checks live in server/dal.ts and run on every protected page, action and route.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user);

  if (!signedIn && isProtectedPath(pathname)) {
    const url = new URL("/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  // Signed-in users are NOT bounced away from /signin here: a cookie can outlive a
  // session the DAL has revoked (e.g. after a password reset), and redirecting on the
  // cookie alone would lock that user out. The sign-in page checks the DAL instead.
  return NextResponse.next();
});

export const config = {
  // Skip static assets, images and the auth endpoints themselves.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
