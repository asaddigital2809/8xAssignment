"use server";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { PASSWORD_MAX, passwordProblem } from "@/domain/auth";
import { changePassword } from "@/server/authService";
import { getCurrentUser } from "@/server/dal";

export type PasswordFormState = { error?: string; fieldErrors?: Record<string, string> };

const newPassword = z
  .string()
  .max(PASSWORD_MAX)
  .superRefine((value, ctx) => {
    const problem = passwordProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

const REASON: Record<"wrong_current" | "no_password" | "same", string> = {
  wrong_current: "Your current password is incorrect.",
  no_password: "This account signs in with GitHub and has no password. Use “Forgot password” to set one.",
  same: "Choose a password different from your current one.",
};

export async function changePasswordAction(_prev: PasswordFormState, form: FormData): Promise<PasswordFormState> {
  // Authorization at the action itself (actions are reachable directly, not only via the page).
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = z
    .object({ current: z.string().min(1, "Enter your current password.").max(PASSWORD_MAX), password: newPassword, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." })
    .safeParse({ current: String(form.get("current") ?? ""), password: String(form.get("password") ?? ""), confirm: String(form.get("confirm") ?? "") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }

  try {
    const result = await changePassword(user.id, parsed.data.current, parsed.data.password);
    if (!result.ok) return { error: REASON[result.reason] };
    // All sessions (including this one) are now revoked; sign this device back in.
    await signIn("credentials", { email: result.email, password: parsed.data.password, redirectTo: "/account/security?changed=1" });
  } catch (err) {
    unstable_rethrow(err);
    console.error(err);
    return { error: "Something went wrong on our side. Please try again." };
  }
  return {};
}
