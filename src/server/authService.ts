import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { emailTokens, users } from "@/db/schema";
import { normalizeEmail, type Role } from "@/domain/auth";
import { getAppOrigin } from "./appUrl";
import { devOtpEnabled, matchesDevOtp } from "./devOtp";
import { activationEmail, alreadyRegisteredEmail, passwordResetEmail, sendMail } from "./mailer";
import { getDummyHash, hashPassword, verifyPassword } from "./password";
import { generateToken, hashToken } from "./tokens";

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

type Purpose = "activate" | "reset";

async function issueToken(userId: string, purpose: Purpose, ttlMs: number): Promise<string> {
  const token = generateToken();
  // Any earlier unused link of the same kind stops working.
  await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailTokens.userId, userId), eq(emailTokens.purpose, purpose), isNull(emailTokens.usedAt)));
  await db.insert(emailTokens).values({
    userId,
    purpose,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
}

/**
 * Marks a token used and returns its user, in one conditional UPDATE, so a link works
 * exactly once even if it's submitted twice concurrently.
 */
async function consumeToken(token: string, purpose: Purpose): Promise<string | null> {
  const [row] = await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(emailTokens.tokenHash, hashToken(token)),
        eq(emailTokens.purpose, purpose),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: emailTokens.userId });
  return row?.userId ?? null;
}

async function findUserByEmail(email: string) {
  const [user] = await db
    .select({ id: users.id, emailVerified: users.emailVerified, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return user;
}

// In fixed-OTP test mode (see devOtp.ts) nothing is emailed: the user enters the code instead.
async function sendActivation(userId: string, email: string) {
  if (devOtpEnabled()) return;
  const token = await issueToken(userId, "activate", ACTIVATION_TTL_MS);
  await sendMail(activationEmail(email, `${await getAppOrigin()}/verify-email?token=${token}`));
}

async function sendReset(userId: string, email: string) {
  if (devOtpEnabled()) return;
  const token = await issueToken(userId, "reset", RESET_TTL_MS);
  await sendMail(passwordResetEmail(email, `${await getAppOrigin()}/reset-password?token=${token}`));
}

/**
 * Always "succeeds" from the caller's point of view, so the response never reveals
 * whether an email is registered. An existing unverified account just gets a fresh
 * activation link; its password is NOT changed (otherwise anyone could set the
 * password on someone else's pending account).
 */
export async function register(input: { name: string; email: string; password: string }): Promise<void> {
  const email = normalizeEmail(input.email);
  // Hash up front so both branches cost the same (no enumeration by response time).
  const passwordHash = await hashPassword(input.password);
  const existing = await findUserByEmail(email);

  if (existing) {
    if (existing.emailVerified) {
      if (!devOtpEnabled()) await sendMail(alreadyRegisteredEmail(email, `${await getAppOrigin()}/forgot-password`));
    } else {
      await sendActivation(existing.id, email);
    }
    return;
  }

  const [created] = await db
    .insert(users)
    .values({ name: input.name.trim(), email, passwordHash })
    .onConflictDoNothing({ target: users.email }) // concurrent duplicate register
    .returning({ id: users.id });
  if (created) await sendActivation(created.id, email);
}

export async function resendActivation(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await findUserByEmail(email);
  if (user && !user.emailVerified) await sendActivation(user.id, email);
}

/** Returns false if the link is invalid, expired or already used. */
export async function activateAccount(token: string): Promise<boolean> {
  const userId = await consumeToken(token, "activate");
  if (!userId) return false;
  await db
    .update(users)
    .set({ emailVerified: sql`coalesce(${users.emailVerified}, now())` })
    .where(eq(users.id, userId));
  return true;
}

export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await findUserByEmail(email);
  if (user) await sendReset(user.id, email);
}

/**
 * Sets a new password from a reset link. Bumps password_changed_at, which invalidates
 * every session issued before now (see dal.ts). Completing a reset also proves inbox
 * control, so the email counts as verified.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const userId = await consumeToken(token, "reset");
  if (!userId) return false;
  await setNewPassword(userId, newPassword);
  return true;
}

async function setNewPassword(userId: string, newPassword: string): Promise<void> {
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      passwordChangedAt: new Date(),
      emailVerified: sql`coalesce(${users.emailVerified}, now())`,
    })
    .where(eq(users.id, userId));
}

// --- Fixed-OTP test mode (DEV_FIXED_OTP). Same outcomes as the link flows above. ---

/** Activates an unverified account with the test code. False for a wrong code or unknown/active account. */
export async function activateWithCode(rawEmail: string, code: string): Promise<boolean> {
  if (!matchesDevOtp(code)) return false;
  const user = await findUserByEmail(normalizeEmail(rawEmail));
  if (!user || user.emailVerified) return false;
  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id));
  return true;
}

/** Resets a password with the test code (and revokes older sessions, like the link flow). */
export async function resetWithCode(rawEmail: string, code: string, newPassword: string): Promise<boolean> {
  if (!matchesDevOtp(code)) return false;
  const user = await findUserByEmail(normalizeEmail(rawEmail));
  if (!user) return false;
  await setNewPassword(user.id, newPassword);
  return true;
}

export type CredentialsResult =
  | { ok: true; user: { id: string; name: string | null; email: string; role: Role } }
  | { ok: false; reason: "invalid" | "unverified" };

export async function verifyCredentials(rawEmail: string, password: string): Promise<CredentialsResult> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, normalizeEmail(rawEmail)))
    .limit(1);

  // Verify against a dummy hash when there's no user/password, so timing doesn't leak existence.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !user.passwordHash || !valid) return { ok: false, reason: "invalid" };
  // Only reveal "unverified" once the password is proven correct.
  if (!user.emailVerified) return { ok: false, reason: "unverified" };
  return { ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
