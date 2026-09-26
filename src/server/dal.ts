import "server-only";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import type { SessionUser } from "@/domain/auth";

/**
 * The real auth check (the proxy only does optimistic redirects). Every call re-reads
 * the user from the database, so a deleted user, a demoted admin, or a password change
 * takes effect immediately; nothing authorization-related is trusted from the JWT
 * beyond the user id. Memoized per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      passwordChangedAt: users.passwordChangedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user || !user.emailVerified) return null;
  // Sessions issued before the last password change/reset are dead.
  if (user.passwordChangedAt && session.authTime < user.passwordChangedAt.getTime()) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** For pages: signed-out users go to sign-in and come back afterwards. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
  return user;
}

/** For admin pages: non-admins get a 404 (the admin area isn't advertised). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  return user;
}
