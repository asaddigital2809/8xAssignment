import { AuthCard } from "@/components/forms";
import { devOtpCode } from "@/server/devOtp";
import { ActivateForm, ActivateWithCodeForm, ResendActivationForm, TestModeNotice } from "../AuthForms";

// Activation happens on a button press (POST), not on page load, so link scanners in
// mail clients that pre-open URLs can't consume the token.
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token, email } = await searchParams;
  const testCode = devOtpCode();

  if (testCode) {
    return (
      <AuthCard title="Activate your account">
        <div className="space-y-3">
          <TestModeNotice code={testCode} />
          <ActivateWithCodeForm email={typeof email === "string" ? email : undefined} />
        </div>
      </AuthCard>
    );
  }

  if (typeof token === "string" && token) {
    return (
      <AuthCard title="Activate your account">
        <ActivateForm token={token} />
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Resend activation email">
      <ResendActivationForm email={typeof email === "string" ? email : undefined} />
    </AuthCard>
  );
}
