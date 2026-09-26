"use client";

import { useEffect } from "react";

/** Route-level error boundary: an unexpected server/render failure shows this instead of a blank page. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto my-12 max-w-md rounded border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-medium text-red-800">Something went wrong</p>
      <p className="mt-1 text-sm text-red-700">We couldn&apos;t load this page. Please try again.</p>
      {error.digest && <p className="mt-1 text-xs text-red-400">Reference: {error.digest}</p>}
      <button onClick={() => retry()} className="mt-4 rounded bg-white px-4 py-1.5 text-sm shadow-sm ring-1 ring-red-200 hover:bg-red-100">
        Try again
      </button>
    </div>
  );
}
