import Link from "next/link";
import type { ReactNode } from "react";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-gray-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
      {label}
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto my-12 max-w-md rounded border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-medium text-red-800">Something went wrong</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 rounded bg-white px-4 py-1.5 text-sm shadow-sm ring-1 ring-red-200 hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyView({ title, children, action }: { title: string; children?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="mx-auto my-12 max-w-md text-center">
      <p className="text-lg font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-gray-600">{children}</div>}
      {action && (
        <Link href={action.href} className="mt-4 inline-block rounded-full bg-cta px-5 py-2 text-sm font-medium hover:bg-cta-dark">
          {action.label}
        </Link>
      )}
    </div>
  );
}
