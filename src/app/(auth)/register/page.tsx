import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/forms";
import { getCurrentUser } from "@/server/dal";
import { devOtpCode } from "@/server/devOtp";
import { RegisterForm, TestModeNotice } from "../AuthForms";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  const testCode = devOtpCode();
  return (
    <AuthCard title="Create account">
      <div className="space-y-3">
        {testCode && <TestModeNotice code={testCode} />}
        <RegisterForm />
        <p className="border-t pt-3 text-sm">
          Already have an account?{" "}
          <Link href="/signin" className="text-link hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
