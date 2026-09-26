import Link from "next/link";
import { AuthCard } from "@/components/forms";
import { devOtpCode } from "@/server/devOtp";
import { ResetPasswordForm, ResetWithCodeForm, TestModeNotice } from "../AuthForms";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, email } = await searchParams;
  const testCode = devOtpCode();

  if (testCode) {
    return (
      <AuthCard title="Choose a new password">
        <div className="space-y-3">
          <TestModeNotice code={testCode} />
          <ResetWithCodeForm email={typeof email === "string" ? email : undefined} />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      {typeof token === "string" && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Link href="/forgot-password" className="text-blue-700 hover:underline">
          This link is incomplete. Request a new reset link.
        </Link>
      )}
    </AuthCard>
  );
}
