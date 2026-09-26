import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/forms";
import { getCurrentUser } from "@/server/dal";
import { RegisterForm } from "../AuthForms";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <AuthCard title="Create account">
      <div className="space-y-3">
        <RegisterForm />
        <p className="border-t pt-3 text-sm">
          Already have an account?{" "}
          <Link href="/signin" className="text-blue-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
