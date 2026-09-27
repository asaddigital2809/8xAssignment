"use client";

import { useState, type FormEvent } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ProductImage } from "@/components/ProductImage";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { adminRepository as repo } from "@/data/adminRepository";
import type { AdminCategoryRow } from "@/domain/admin";
import { useAdminCategories, useCategoryForm } from "@/state/admin";
import { attempt } from "@/state/mutation";

export function CategoriesAdmin() {
  const { state, retry } = useAdminCategories();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string>();

  async function remove(c: AdminCategoryRow) {
    if (!window.confirm(`Delete the "${c.name}" category?`)) return;
    const result = await attempt(() => repo.deleteCategory(c.id));
    setError(result.ok ? undefined : result.error);
    if (result.ok) retry();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        {editing !== "new" && (
          <button onClick={() => setEditing("new")} className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium hover:bg-amber-500">
            New category
          </button>
        )}
      </div>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {editing === "new" && (
        <CategoryForm
          onDone={(saved) => {
            setEditing(null);
            if (saved) retry();
          }}
        />
      )}

      {state.status === "loading" && <Spinner label="Loading categories…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && <EmptyView title="No categories yet" />}
      {state.status === "success" && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.data.map((c) =>
            editing === c.id ? (
              <li key={c.id} className="sm:col-span-2">
                <CategoryForm
                  initial={c}
                  onDone={(saved) => {
                    setEditing(null);
                    if (saved) retry();
                  }}
                />
              </li>
            ) : (
              <li key={c.id} className="flex items-center gap-3 rounded bg-white p-3 shadow-sm">
                <span className="relative h-14 w-14 shrink-0 bg-gray-50">
                  <ProductImage src={c.image} alt="" fill sizes="56px" className="object-contain" />
                </span>
                <div className="flex-1 text-sm">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-gray-500">
                    {c.id} · {c.productCount} product{c.productCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setEditing(c.id)} className="text-blue-700 hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => void remove(c)}
                    disabled={c.productCount > 0}
                    title={c.productCount > 0 ? "Move or delete its products first" : undefined}
                    className="text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function CategoryForm({ initial, onDone }: { initial?: AdminCategoryRow; onDone: (saved: boolean) => void }) {
  const form = useCategoryForm(initial);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (await form.save()) onDone(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded bg-white p-4 shadow-sm">
      <h2 className="font-medium">{initial ? `Edit ${initial.name}` : "New category"}</h2>
      <label className="block text-sm">
        Name
        <input name="name" value={form.name} onChange={(e) => form.setName(e.target.value)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2" />
        {!initial && <span className="text-xs text-gray-500">The URL id is made from the name and can&apos;t change later.</span>}
      </label>
      <ImageUploader uploads={form.images} max={1} label="Tile image" />
      {form.error && <p role="alert" className="text-sm text-red-700">{form.error}</p>}
      <div className="flex gap-3">
        <button disabled={form.saving || form.images.uploading} className="rounded-full bg-amber-400 px-5 py-2 text-sm font-medium hover:bg-amber-500 disabled:opacity-60">
          {form.saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => onDone(false)} className="text-sm text-blue-700 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
