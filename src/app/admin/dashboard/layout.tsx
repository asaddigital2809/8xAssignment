import { AdminNavLinks } from "@/components/admin/AdminNavLinks";

// Navigation only. Every admin page calls requireAdmin() (role read from the database),
// and every /api/admin route uses withAdmin(): a layout can't be the guard because it
// doesn't re-render on client navigation.
export default function AdminLayout({ children }: LayoutProps<"/admin/dashboard">) {
  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <aside className="space-y-2">
        <p className="px-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Admin</p>
        <AdminNavLinks />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
