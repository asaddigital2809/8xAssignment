"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormError, Notice, SubmitButton } from "@/components/forms";
import {
  activateAction,
  forgotPasswordAction,
  registerAction,
  resendActivationAction,
  resetPasswordAction,
  signInAction,
  type FormState,
} from "./actions";

const initial: FormState = {};

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(signInAction, initial);
  const f = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {state.error === "unverified" ? (
        <FormError message="Your email isn't confirmed yet. Check your inbox for the activation link." />
      ) : (
        <FormError message={state.error} />
      )}
      {state.error === "unverified" && (
        <Link href={`/verify-email?email=${encodeURIComponent(state.email ?? "")}`} className="block text-sm text-blue-700 hover:underline">
          Resend activation email
        </Link>
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} error={f.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={f.password} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, initial);
  const f = state.fieldErrors ?? {};

  if (state.done) {
    return (
      <Notice>
        Check <strong>{state.email}</strong> for a link to activate your account. It&apos;s valid for 24 hours.
      </Notice>
    );
  }
  return (
    <form action={action} noValidate className="space-y-3">
      <FormError message={state.error} />
      <Field label="Your name" name="name" autoComplete="name" error={f.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} error={f.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" error={f.password} />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" error={f.confirm} />
      <p className="text-xs text-gray-500">At least 8 characters, with a letter and a number.</p>
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ActivateForm({ token }: { token: string }) {
  const [state, action] = useActionState(activateAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      {state.error ? (
        <Link href="/verify-email" className="block text-sm text-blue-700 hover:underline">
          Send a new activation link
        </Link>
      ) : (
        <SubmitButton pendingLabel="Activating…">Activate my account</SubmitButton>
      )}
    </form>
  );
}

export function ResendActivationForm({ email }: { email?: string }) {
  const [state, action] = useActionState(resendActivationAction, initial);
  if (state.done) {
    return <Notice>If {state.email} has an account waiting for activation, a new link is on its way.</Notice>;
  }
  return (
    <form action={action} noValidate className="space-y-3">
      <FormError message={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={email} error={state.fieldErrors?.email} />
      <SubmitButton pendingLabel="Sending…">Resend activation email</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  if (state.done) {
    return <Notice>If {state.email} has an account, we&apos;ve sent a link to reset the password. It&apos;s valid for 1 hour.</Notice>;
  }
  return (
    <form action={action} noValidate className="space-y-3">
      <FormError message={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      <SubmitButton pendingLabel="Sending…">Email me a reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  const f = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      {state.error && (
        <Link href="/forgot-password" className="block text-sm text-blue-700 hover:underline">
          Request a new reset link
        </Link>
      )}
      <Field label="New password" name="password" type="password" autoComplete="new-password" error={f.password} />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={f.confirm} />
      <SubmitButton pendingLabel="Saving…">Set new password</SubmitButton>
    </form>
  );
}
