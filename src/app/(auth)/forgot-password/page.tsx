import { AuthCard } from "@/components/forms";
import { ForgotPasswordForm } from "../AuthForms";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot password">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
