import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/server/dal";

export async function AccountNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link href="/signin" className="hover:underline">
        Sign in
      </Link>
    );
  }
  return (
    <>
      <Link href="/account" className="hover:underline">
        Hello, {user.name?.split(" ")[0] ?? "account"}
      </Link>
      {user.role === "admin" && (
        <Link href="/admin/dashboard" className="hover:underline">
          Admin
        </Link>
      )}
      <form action={signOutAction}>
        <button className="hover:underline">Sign out</button>
      </form>
    </>
  );
}
