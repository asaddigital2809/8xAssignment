"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { adminRepository as repo } from "@/data/adminRepository";
import { NotFoundError } from "@/data/http";
import { PRODUCT_MAX_IMAGES, type AdminProductRow } from "@/domain/admin";
import { useAdminCategories, useAdminProduct, useProductForm } from "@/state/admin";
import { attempt } from "@/state/mutation";

/** /admin/dashboard/products/new and /admin/dashboard/products/:id */
export function ProductEditor({ id }: { id?: string }) {
  if (!id) return <ProductForm />;
  return <ExistingProduct id={id} />;
}

function ExistingProduct({ id }: { id: string }) {
  const { state, retry, replace } = useAdminProduct(id);
  if (state.status === "loading") return <Spinner label="Loading product…" />;
  if (state.status === "error") {
    if (state.error instanceof NotFoundError) return <EmptyView title="Product not found" action={{ href: "/admin/dashboard/products", label: "All products" }} />;
    return <ErrorView message={state.error.message} onRetry={retry} />;
  }
  return <ProductForm key={state.data.id} initial={state.data} onUpdated={replace} />;
}

function ProductForm({ initial, onUpdated }: { initial?: AdminProductRow; onUpdated?: (p: AdminProductRow) => void }) {
  const router = useRouter();
  const form = useProductForm(initial);
  const categories = useAdminCategories();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const f = form.errors;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const saved = await form.save();
    if (!saved) return;
    if (initial) setNotice("Saved.");
    else router.push(`/admin/dashboard/products/${saved.id}?created=1`);
  }

  async function onDelete() {
    if (!initial || !window.confirm(`Delete "${initial.title}"? If it has been ordered it will be archived instead.`)) return;
    setBusy(true);
    const result = await attempt(() => repo.deleteProduct(initial.id));
    setBusy(false);
    if (!result.ok) return setNotice(result.error);
    if (result.data.result === "deleted") router.push("/admin/dashboard/products");
    else {
      setNotice("This product has orders, so it was archived instead: hidden from the store, kept for order history.");
      onUpdated?.({ ...initial, archived: true });
    }
  }

  async function onRestore() {
    if (!initial) return;
    setBusy(true);
    const result = await attempt(() => repo.restoreProduct(initial.id));
    setBusy(false);
    setNotice(result.ok ? "Restored: the product is live again." : result.error);
    if (result.ok) onUpdated?.(result.data);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-4">
      <Link href="/admin/dashboard/products" className="text-sm text-link hover:underline">
        ← All products
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{initial ? "Edit product" : "New product"}</h1>
        {initial && (
          <div className="flex items-center gap-3 text-sm">
            {initial.archived ? (
              <span className="rounded bg-gray-200 px-2 py-0.5 text-gray-700">Archived</span>
            ) : (
              <Link href={`/product/${initial.id}`} className="text-link hover:underline" target="_blank">
                View in store ↗
              </Link>
            )}
          </div>
        )}
      </div>
      {notice && <p role="status" className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
      {form.error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{form.error}</p>}

      <div className="space-y-3 rounded bg-white p-4 shadow-sm">
        <Text label="Title" name="title" value={form.fields.title} onChange={(v) => form.setField("title", v)} error={f.title} />
        <label className="block text-sm">
          Description
          <textarea
            name="description"
            rows={4}
            value={form.fields.description}
            onChange={(e) => form.setField("description", e.target.value)}
            aria-invalid={Boolean(f.description)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 aria-[invalid=true]:border-red-500"
          />
          {f.description && <span className="text-xs text-red-700">{f.description}</span>}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Category
            <select
              name="categoryId"
              value={form.fields.categoryId}
              onChange={(e) => form.setField("categoryId", e.target.value)}
              aria-invalid={Boolean(f.categoryId)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 aria-[invalid=true]:border-red-500"
            >
              <option value="">{categories.state.status === "loading" ? "Loading…" : "Choose a category"}</option>
              {categories.state.status === "success" &&
                categories.state.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            {f.categoryId && <span className="text-xs text-red-700">{f.categoryId}</span>}
          </label>
          <Text label="Brand (optional)" name="brand" value={form.fields.brand} onChange={(v) => form.setField("brand", v)} error={f.brand} />
          <Text label="Price (USD)" name="price" value={form.fields.price} onChange={(v) => form.setField("price", v)} error={f.priceCents} inputMode="decimal" prefix="$" />
          <Text label="Stock" name="stock" value={form.fields.stock} onChange={(v) => form.setField("stock", v.replace(/\D/g, ""))} error={f.stock} inputMode="numeric" />
        </div>
      </div>

      <div className="rounded bg-white p-4 shadow-sm">
        <ImageUploader uploads={form.images} max={PRODUCT_MAX_IMAGES} />
        {f.images && <p className="mt-1 text-xs text-red-700">{f.images}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={form.saving || form.images.uploading} className="rounded-full bg-cta px-6 py-2 font-medium hover:bg-cta-dark disabled:opacity-60">
          {form.saving ? "Saving…" : initial ? "Save changes" : "Create product"}
        </button>
        {initial && !initial.archived && (
          <button type="button" onClick={onDelete} disabled={busy} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">
            Delete
          </button>
        )}
        {initial?.archived && (
          <button type="button" onClick={onRestore} disabled={busy} className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            Restore to store
          </button>
        )}
      </div>
    </form>
  );
}

function Text(props: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  inputMode?: "decimal" | "numeric";
  prefix?: ReactNode;
}) {
  return (
    <label className="block text-sm">
      {props.label}
      <span className="mt-1 flex items-center rounded border border-gray-300 has-[[aria-invalid=true]]:border-red-500">
        {props.prefix && <span className="pl-3 text-gray-500">{props.prefix}</span>}
        <input
          name={props.name}
          value={props.value}
          inputMode={props.inputMode}
          onChange={(e) => props.onChange(e.target.value)}
          aria-invalid={Boolean(props.error)}
          className="block w-full rounded px-3 py-2 outline-none"
        />
      </span>
      {props.error && <span className="text-xs text-red-700">{props.error}</span>}
    </label>
  );
}
