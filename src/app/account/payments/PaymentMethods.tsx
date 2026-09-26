"use client";

import { useState, type FormEvent } from "react";
import { CardFields, cardLabel } from "@/components/CardFields";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { isExpired } from "@/domain/payment";
import { usePaymentMethods } from "@/state/accountData";
import { useCardForm } from "@/state/cardForm";

export function PaymentMethods() {
  const cards = usePaymentMethods();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();

  async function run(id: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(id);
    const result = await action();
    setBusy(undefined);
    setError(result.ok ? undefined : result.error);
  }

  const { state, retry } = cards;
  const now = new Date();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payment methods</h1>
        {!adding && state.status === "success" && (
          <button onClick={() => setAdding(true)} className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium hover:bg-amber-500">
            Add a card
          </button>
        )}
      </div>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {adding && <NewCard onDone={() => setAdding(false)} create={cards.create} />}

      {state.status === "loading" && <Spinner label="Loading your payment methods…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && !adding && <EmptyView title="No saved cards yet">Add one here, or during checkout.</EmptyView>}
      {state.status === "success" && (
        <ul className="space-y-3">
          {state.data.map((c) => (
            <li key={c.id} aria-busy={busy === c.id} className={`flex flex-wrap items-center justify-between gap-3 rounded bg-white p-4 shadow-sm ${c.isDefault ? "ring-2 ring-amber-400" : ""}`}>
              <div className="text-sm">
                <p className="font-medium">{cardLabel(c)}</p>
                <p className="text-gray-600">
                  {c.holderName}
                  {c.isDefault && <span className="ml-2 text-xs font-medium text-amber-700">Default</span>}
                  {isExpired(c.expMonth, c.expYear, now) && <span className="ml-2 text-xs font-medium text-red-700">Expired</span>}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                {!c.isDefault && (
                  <button onClick={() => run(c.id, () => cards.setDefault(c.id))} disabled={busy === c.id} className="text-blue-700 hover:underline disabled:opacity-50">
                    Set as default
                  </button>
                )}
                <button onClick={() => run(c.id, () => cards.remove(c.id))} disabled={busy === c.id} className="text-blue-700 hover:underline disabled:opacity-50">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewCard({ onDone, create }: { onDone: () => void; create: ReturnType<typeof usePaymentMethods>["create"] }) {
  const form = useCardForm();
  const [makeDefault, setMakeDefault] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const card = form.validate();
    if (!card) return;
    setSaving(true);
    const result = await create(card, makeDefault);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    form.reset();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded bg-white p-4 shadow-sm">
      <h2 className="font-medium">New card</h2>
      <CardFields fields={form.fields} errors={form.errors} brand={form.brand} onChange={form.setField} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
        Make this my default card
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button disabled={saving} className="rounded-full bg-amber-400 px-5 py-2 text-sm font-medium hover:bg-amber-500 disabled:opacity-60">
          {saving ? "Saving…" : "Save card"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-blue-700 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
