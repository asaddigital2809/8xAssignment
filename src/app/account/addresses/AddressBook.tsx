"use client";

import { useState, type FormEvent } from "react";
import { AddressFields, formatAddress } from "@/components/AddressFields";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import type { Address, SavedAddress } from "@/domain/types";
import { useAddresses } from "@/state/accountData";
import { useAddressForm } from "@/state/addressForm";

export function AddressBook() {
  const book = useAddresses();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();

  async function run(id: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(id);
    const result = await action();
    setBusy(undefined);
    setError(result.ok ? undefined : result.error);
  }

  const { state, retry } = book;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your addresses</h1>
        {editing !== "new" && state.status === "success" && (
          <button onClick={() => setEditing("new")} className="rounded-full bg-cta px-4 py-1.5 text-sm font-medium hover:bg-cta-dark">
            Add address
          </button>
        )}
      </div>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {editing === "new" && (
        <AddressEditor
          title="New address"
          onCancel={() => setEditing(null)}
          onSave={async (address, makeDefault) => {
            const result = await book.create(address, makeDefault);
            if (result.ok) setEditing(null);
            return result;
          }}
          allowMakeDefault
        />
      )}

      {state.status === "loading" && <Spinner label="Loading your addresses…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && editing !== "new" && (
        <EmptyView title="No saved addresses yet">Add one here, or during checkout.</EmptyView>
      )}
      {state.status === "success" && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.data.map((a) =>
            editing === a.id ? (
              <li key={a.id} className="sm:col-span-2">
                <AddressEditor
                  title="Edit address"
                  initial={a}
                  onCancel={() => setEditing(null)}
                  onSave={async (address) => {
                    const result = await book.update(a.id, address);
                    if (result.ok) setEditing(null);
                    return result;
                  }}
                />
              </li>
            ) : (
              <AddressCard
                key={a.id}
                address={a}
                busy={busy === a.id}
                onEdit={() => setEditing(a.id)}
                onDelete={() => run(a.id, () => book.remove(a.id))}
                onMakeDefault={() => run(a.id, () => book.setDefault(a.id))}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function AddressCard(props: { address: SavedAddress; busy: boolean; onEdit: () => void; onDelete: () => void; onMakeDefault: () => void }) {
  const { address: a, busy } = props;
  return (
    <li className={`rounded bg-white p-4 shadow-sm ${a.isDefault ? "ring-2 ring-amber-400" : ""}`} aria-busy={busy}>
      {a.isDefault && <p className="mb-1 text-xs font-medium text-amber-700">Default</p>}
      <p className="text-sm">{formatAddress(a)}</p>
      <div className="mt-3 flex gap-3 text-sm">
        <button onClick={props.onEdit} disabled={busy} className="text-link hover:underline disabled:opacity-50">
          Edit
        </button>
        <button onClick={props.onDelete} disabled={busy} className="text-link hover:underline disabled:opacity-50">
          Remove
        </button>
        {!a.isDefault && (
          <button onClick={props.onMakeDefault} disabled={busy} className="text-link hover:underline disabled:opacity-50">
            Set as default
          </button>
        )}
      </div>
    </li>
  );
}

function AddressEditor(props: {
  title: string;
  initial?: Address;
  allowMakeDefault?: boolean;
  onCancel: () => void;
  onSave: (address: Address, makeDefault: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const form = useAddressForm(props.initial);
  const [makeDefault, setMakeDefault] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const address = form.validate();
    if (!address) return;
    setSaving(true);
    const result = await props.onSave(address, makeDefault);
    setSaving(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded bg-white p-4 shadow-sm">
      <h2 className="font-medium">{props.title}</h2>
      <AddressFields address={form.address} errors={form.errors} onChange={form.setField} />
      {props.allowMakeDefault && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
          Make this my default address
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button disabled={saving} className="rounded-full bg-cta px-5 py-2 text-sm font-medium hover:bg-cta-dark disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={props.onCancel} className="text-sm text-link hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
