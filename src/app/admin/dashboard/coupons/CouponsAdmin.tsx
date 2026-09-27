"use client";

import { useState, type FormEvent } from "react";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { adminRepository as repo } from "@/data/adminRepository";
import type { AdminCoupon } from "@/domain/admin";
import { describeCoupon } from "@/domain/coupon";
import { useAdminCoupons, useCouponForm } from "@/state/admin";
import { attempt } from "@/state/mutation";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" }) : null);

export function CouponsAdmin() {
  const { state, retry } = useAdminCoupons();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string>();

  async function remove(c: AdminCoupon) {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    const result = await attempt(() => repo.deleteCoupon(c.id));
    setError(result.ok ? undefined : result.error);
    if (result.ok) retry();
  }

  const done = (saved: boolean) => {
    setEditing(null);
    if (saved) retry();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Coupons</h1>
        {editing !== "new" && (
          <button onClick={() => setEditing("new")} className="rounded-full bg-cta px-4 py-1.5 text-sm font-medium hover:bg-cta-dark">
            New coupon
          </button>
        )}
      </div>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {editing === "new" && <CouponForm onDone={done} />}

      {state.status === "loading" && <Spinner label="Loading coupons…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && <EmptyView title="No coupons yet" />}
      {state.status === "success" && (
        <ul className="space-y-3">
          {state.data.map((c) =>
            editing === c.id ? (
              <li key={c.id}>
                <CouponForm initial={c} onDone={done} />
              </li>
            ) : (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-white p-4 text-sm shadow-sm">
                <div>
                  <p className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{c.code}</span>
                    <span className={`rounded px-1.5 text-xs ${c.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>{c.active ? "Active" : "Inactive"}</span>
                  </p>
                  <p className="text-gray-700">{describeCoupon(c)}</p>
                  <p className="text-gray-500">
                    Used {c.timesUsed}
                    {c.usageLimit !== null && ` / ${c.usageLimit}`}
                    {c.oncePerUser && " · once per customer"}
                    {day(c.startsAt) && ` · from ${day(c.startsAt)}`}
                    {day(c.expiresAt) && ` · until ${day(c.expiresAt)}`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(c.id)} className="text-link hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => void remove(c)}
                    disabled={c.timesUsed > 0}
                    title={c.timesUsed > 0 ? "Used coupons can't be deleted; deactivate instead" : undefined}
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

function CouponForm({ initial, onDone }: { initial?: AdminCoupon; onDone: (saved: boolean) => void }) {
  const form = useCouponForm(initial);
  const f = form.fields;
  const input = "mt-1 block w-full rounded border border-gray-300 px-3 py-2";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (await form.save()) onDone(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded bg-white p-4 shadow-sm">
      <h2 className="font-medium">{initial ? `Edit ${initial.code}` : "New coupon"}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Code
          <input name="code" value={f.code} onChange={(e) => form.setField("code", e.target.value.toUpperCase())} className={`${input} font-mono uppercase`} />
        </label>
        <label className="text-sm">
          Type
          <select name="kind" value={f.kind} onChange={(e) => form.setField("kind", e.target.value as "percent" | "fixed")} className={input}>
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off</option>
          </select>
        </label>
        <label className="text-sm">
          {f.kind === "percent" ? "Percent (1–100)" : "Amount off (USD)"}
          <input name="value" inputMode="decimal" value={f.value} onChange={(e) => form.setField("value", e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          Minimum order (USD)
          <input name="minSubtotal" inputMode="decimal" value={f.minSubtotal} onChange={(e) => form.setField("minSubtotal", e.target.value)} className={input} />
        </label>
        {f.kind === "percent" && (
          <label className="text-sm">
            Max discount (USD, optional)
            <input name="maxDiscount" inputMode="decimal" value={f.maxDiscount} onChange={(e) => form.setField("maxDiscount", e.target.value)} className={input} />
          </label>
        )}
        <label className="text-sm">
          Total uses (optional)
          <input name="usageLimit" inputMode="numeric" value={f.usageLimit} onChange={(e) => form.setField("usageLimit", e.target.value.replace(/\D/g, ""))} className={input} />
        </label>
        <label className="text-sm">
          Starts (optional)
          <input name="startsAt" type="date" value={f.startsAt} onChange={(e) => form.setField("startsAt", e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          Ends (optional)
          <input name="expiresAt" type="date" value={f.expiresAt} onChange={(e) => form.setField("expiresAt", e.target.value)} className={input} />
        </label>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="oncePerUser" checked={f.oncePerUser} onChange={(e) => form.setField("oncePerUser", e.target.checked)} />
          Once per customer
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" checked={f.active} onChange={(e) => form.setField("active", e.target.checked)} />
          Active
        </label>
      </div>
      {form.error && <p role="alert" className="text-sm text-red-700">{form.error}</p>}
      <div className="flex gap-3">
        <button disabled={form.saving} className="rounded-full bg-cta px-5 py-2 text-sm font-medium hover:bg-cta-dark disabled:opacity-60">
          {form.saving ? "Saving…" : "Save coupon"}
        </button>
        <button type="button" onClick={() => onDone(false)} className="text-sm text-link hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
