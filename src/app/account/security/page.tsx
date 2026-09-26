import { Notice } from "@/components/forms";
import { requireUser } from "@/server/dal";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function SecurityPage({ searchParams }: PageProps<"/account/security">) {
  await requireUser("/account/security");
  const { changed } = await searchParams;
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Password &amp; security</h1>
      {changed && <Notice>Your password was changed. Other devices have been signed out.</Notice>}
      <section className="rounded bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-medium">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
