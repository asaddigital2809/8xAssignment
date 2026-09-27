"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function Field({
  label,
  name,
  type = "text",
  error,
  defaultValue,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 aria-[invalid=true]:border-red-500"
      />
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

export function SubmitButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-cta py-2 font-medium hover:bg-cta-dark disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">{children}</p>;
}

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-2 max-w-sm">
      <p className="mb-4 text-center text-3xl font-bold tracking-tight">
        amzn<span className="text-[#e77600]">.clone</span>
      </p>
      <div className="rounded-lg border border-gray-300 bg-white p-6">
        <h1 className="mb-4 text-3xl font-normal">{title}</h1>
        {children}
      </div>
    </div>
  );
}
