import { AuthCard } from "@/components/forms";
import { devOtpCode } from "@/server/devOtp";
import { ForgotPasswordForm, TestModeNotice } from "../AuthForms";

export default function ForgotPasswordPage() {
  const testCode = devOtpCode();
  return (
    <AuthCard title="Forgot password">
      <div className="space-y-3">
        {testCode && <TestModeNotice code={testCode} />}
        <ForgotPasswordForm />
      </div>
    </AuthCard>
  );
}
