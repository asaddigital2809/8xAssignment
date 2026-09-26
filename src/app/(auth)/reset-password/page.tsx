import Link from "next/link";
import { AuthCard } from "@/components/forms";
import { ResetPasswordForm } from "../AuthForms";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
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
