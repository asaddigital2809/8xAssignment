"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/forms";
import { changePasswordAction, type PasswordFormState } from "../actions";

const initial: PasswordFormState = {};

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);
  const f = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-3">
      <FormError message={state.error} />
      <Field label="Current password" name="current" type="password" autoComplete="current-password" error={f.current} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" error={f.password} />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={f.confirm} />
      <p className="text-xs text-gray-500">At least 8 characters, with a letter and a number. Other devices will be signed out.</p>
      <SubmitButton pendingLabel="Saving…">Change password</SubmitButton>
    </form>
  );
}
