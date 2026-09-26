import { AccountNavLinks } from "@/components/AccountNavLinks";

// Navigation only. Auth is enforced by each page (requireUser) and by the API, not
// here: layouts don't re-render on client navigation, so they can't be the guard.
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="grid gap-4 md:grid-cols-[200px_1fr]">
      <aside>
        <AccountNavLinks />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
