import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, sql } from "drizzle-orm";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { z } from "zod";
import { db } from "@/db/client";
import { accounts, users } from "@/db/schema";
import { PASSWORD_MAX } from "@/domain/auth";
import { verifyCredentials } from "@/server/authService";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
    /** When the user signed in (ms). Compared against password_changed_at in the DAL. */
    authTime: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    authTime?: number;
  }
}

class UnverifiedEmail extends CredentialsSignin {
  code = "unverified";
}

const credentialsInput = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
});

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = credentialsInput.safeParse(raw);
      if (!parsed.success) return null;
      const result = await verifyCredentials(parsed.data.email, parsed.data.password);
      if (!result.ok) {
        if (result.reason === "unverified") throw new UnverifiedEmail();
        return null; // generic "invalid email or password"
      }
      return { id: result.user.id, name: result.user.name, email: result.user.email };
    },
  }),
];

// GitHub is enabled only when its OAuth app is configured, so the app runs without it.
export const githubEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
if (githubEnabled) providers.push(GitHub);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts }),
  // Credentials requires JWT sessions. The token only carries the user id and sign-in
  // time; role and account state are always read from the database (see server/dal.ts).
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.authTime = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.authTime = token.authTime ?? 0;
      return session;
    },
  },
  events: {
    // Users created through OAuth have a provider-verified email.
    async createUser({ user }) {
      if (user.id) {
        await db
          .update(users)
          .set({ emailVerified: sql`coalesce(${users.emailVerified}, now())` })
          .where(eq(users.id, user.id));
      }
    },
  },
});
