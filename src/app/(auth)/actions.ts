"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { PASSWORD_MAX, passwordProblem, safeRedirectPath } from "@/domain/auth";
import {
  activateAccount,
  activateWithCode,
  register,
  requestPasswordReset,
  resendActivation,
  resetPassword,
  resetWithCode,
} from "@/server/authService";
import { devOtpEnabled } from "@/server/devOtp";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set after a successful submit that stays on the page (e.g. "check your email"). */
  done?: boolean;
  /** Echoed back so a failed submit doesn't clear the email field. */
  email?: string;
};

const email = z.email("Enter a valid email address.").max(254);
const password = z
  .string()
  .max(PASSWORD_MAX)
  .superRefine((value, ctx) => {
    const problem = passwordProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

const str = (form: FormData, key: string) => String(form.get(key) ?? "");

const UNEXPECTED = "Something went wrong on our side. Please try again.";

/**
 * Turns unexpected failures (e.g. the database or SMTP being unreachable) into a form
 * error instead of crashing the page. Next's own redirect/notFound signals are rethrown.
 * Every flow here is safe to retry: a half-finished register just re-sends activation.
 */
async function safely(fn: () => Promise<FormState>, keep: FormState = {}): Promise<FormState> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    console.error(err);
    return { ...keep, error: UNEXPECTED };
  }
}

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX) }).safeParse({
    email: str(form, "email"),
    password: str(form, "password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email: str(form, "email") };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeRedirectPath(str(form, "callbackUrl")),
    });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      return err.code === "unverified"
        ? { error: "unverified", email: parsed.data.email }
        : { error: "Incorrect email or password.", email: parsed.data.email };
    }
    if (err instanceof AuthError) return { error: "Sign-in failed. Please try again.", email: parsed.data.email };
    throw err; // includes Next's redirect on success
  }
  return {};
}

export async function githubSignInAction(form: FormData): Promise<void> {
  await signIn("github", { redirectTo: safeRedirectPath(str(form, "callbackUrl")) });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter your name.").max(80),
      email,
      password,
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." })
    .safeParse({
      name: str(form, "name"),
      email: str(form, "email"),
      password: str(form, "password"),
      confirm: str(form, "confirm"),
    });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email: str(form, "email") };

  return safely(
    async () => {
      await register(parsed.data);
      // Test mode: no email is sent; go straight to entering the code.
      if (devOtpEnabled()) redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
      return { done: true, email: parsed.data.email };
    },
    { email: parsed.data.email },
  );
}

const code = z.string().trim().regex(/^\d{4,8}$/, "Enter the numeric code.");

/** Test mode only: activate with the fixed code. */
export async function activateWithCodeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, code }).safeParse({ email: str(form, "email"), code: str(form, "code") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email: str(form, "email") };
  return safely(async () => {
    const ok = await activateWithCode(parsed.data.email, parsed.data.code);
    if (!ok) return { error: "That code isn't right, or this account is already active.", email: parsed.data.email };
    redirect("/signin?activated=1");
  });
}

/** Test mode only: reset the password with the fixed code. */
export async function resetWithCodeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ email, code, password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." })
    .safeParse({ email: str(form, "email"), code: str(form, "code"), password: str(form, "password"), confirm: str(form, "confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email: str(form, "email") };
  return safely(async () => {
    const ok = await resetWithCode(parsed.data.email, parsed.data.code, parsed.data.password);
    if (!ok) return { error: "That code isn't right for this email.", email: parsed.data.email };
    redirect("/signin?reset=1");
  });
}

export async function resendActivationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(str(form, "email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };
  return safely(async () => {
    await resendActivation(parsed.data);
    return { done: true, email: parsed.data };
  });
}

export async function activateAction(_prev: FormState, form: FormData): Promise<FormState> {
  return safely(async () => {
    const ok = await activateAccount(str(form, "token"));
    if (!ok) return { error: "This activation link is invalid, expired or already used." };
    redirect("/signin?activated=1");
  });
}

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(str(form, "email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };
  return safely(async () => {
    await requestPasswordReset(parsed.data);
    if (devOtpEnabled()) redirect(`/reset-password?email=${encodeURIComponent(parsed.data)}`);
    return { done: true, email: parsed.data };
  });
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." })
    .safeParse({ password: str(form, "password"), confirm: str(form, "confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  return safely(async () => {
    const ok = await resetPassword(str(form, "token"), parsed.data.password);
    if (!ok) return { error: "This reset link is invalid, expired or already used. Request a new one." };
    redirect("/signin?reset=1");
  });
}
