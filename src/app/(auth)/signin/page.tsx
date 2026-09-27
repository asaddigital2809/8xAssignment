import Link from "next/link";
import { redirect } from "next/navigation";
import { githubEnabled } from "@/auth";
import { AuthCard, FormError, Notice } from "@/components/forms";
import { safeRedirectPath } from "@/domain/auth";
import { getCurrentUser } from "@/server/dal";
import { devOtpEnabled } from "@/server/devOtp";
import { githubSignInAction } from "../actions";
import { SignInForm } from "../AuthForms";

// Auth.js redirects here with ?error=<type> for OAuth failures.
const OAUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "That email is already registered with a password. Sign in with your password instead.",
  AccessDenied: "Access was denied.",
};

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(params.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);

  const oauthError = typeof params.error === "string" && params.error !== "CredentialsSignin" ? params.error : undefined;

  return (
    <AuthCard title="Sign in">
      <div className="space-y-3">
        {params.activated && <Notice>Your account is active. Sign in to continue.</Notice>}
        {params.reset && <Notice>Your password was changed. Sign in with the new one.</Notice>}
        {oauthError && <FormError message={OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again."} />}
        <SignInForm callbackUrl={callbackUrl} testMode={devOtpEnabled()} />
        <Link href="/forgot-password" className="block text-sm text-link hover:underline">
          Forgot your password?
        </Link>
        {githubEnabled && (
          <form action={githubSignInAction} className="border-t pt-3">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button className="w-full rounded-full bg-gray-900 py-2 font-medium text-white hover:bg-black">Continue with GitHub</button>
          </form>
        )}
        <p className="border-t pt-3 text-sm">
          New here?{" "}
          <Link href="/register" className="text-link hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
