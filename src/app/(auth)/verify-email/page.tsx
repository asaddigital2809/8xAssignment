import { AuthCard } from "@/components/forms";
import { ActivateForm, ResendActivationForm } from "../AuthForms";

// Activation happens on a button press (POST), not on page load, so link scanners in
// mail clients that pre-open URLs can't consume the token.
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token, email } = await searchParams;

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
