"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { AddressFields, formatAddress } from "@/components/AddressFields";
import { CardFields, cardLabel } from "@/components/CardFields";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { formatPrice } from "@/domain/money";
import { useAddressForm } from "@/state/addressForm";
import { useCardForm } from "@/state/cardForm";
import { useCart, useCartStatus, useCartStore } from "@/state/cartStore";
import { CHECKOUT_STEPS, useCheckoutFlow, type CheckoutStep } from "@/state/checkoutFlow";

type Flow = ReturnType<typeof useCheckoutFlow>;

const STEP_LABEL: Record<CheckoutStep, string> = { address: "1. Shipping address", payment: "2. Payment method", review: "3. Review & place order" };

export function CheckoutView() {
  const router = useRouter();
  const status = useCartStatus();
  const cart = useCart();
  const loadError = useCartStore((s) => s.loadError);
  const flow = useCheckoutFlow();

  if (flow.placeOrder.status === "placed") return <Spinner label="Order placed. Opening confirmation…" />;
  if (status === "loading") return <Spinner label="Loading your cart…" />;
  if (status === "error" || !cart) {
    return <ErrorView message={loadError ?? "Couldn't load your cart."} onRetry={() => void useCartStore.getState().load()} />;
  }
  if (cart.items.length === 0) {
    // Payment can fail after the order was created (cart already emptied): keep the error visible.
    if (flow.placeOrder.status === "error") {
      return (
        <EmptyView title="Payment didn't go through" action={{ href: "/orders", label: "View your orders" }}>
          {flow.placeOrder.message}
        </EmptyView>
      );
    }
    return <EmptyView title="Nothing to check out" action={{ href: "/", label: "Continue shopping" }} />;
  }

  async function place() {
    const order = await flow.submit();
    if (order) router.push(`/orders/${order.id}?placed=1`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <StepPanel flow={flow} step="address" summary={summaryFor(flow, "address")}>
        <AddressStep flow={flow} />
      </StepPanel>
      <StepPanel flow={flow} step="payment" summary={summaryFor(flow, "payment")}>
        <PaymentStep flow={flow} />
      </StepPanel>
      <StepPanel flow={flow} step="review">
        <ReviewStep flow={flow} onPlace={place} />
      </StepPanel>
    </div>
  );
}

function summaryFor(flow: Flow, step: CheckoutStep): string | undefined {
  if (step === "address" && flow.addressBook.state.status === "success") {
    const a = flow.addressBook.state.data.find((x) => x.id === flow.addressId);
    return a && formatAddress(a);
  }
  if (step === "payment" && flow.cards.state.status === "success") {
    const c = flow.cards.state.data.find((x) => x.id === flow.paymentMethodId);
    return c && cardLabel(c);
  }
}

/** Collapsible step: open when current, summarized with a "Change" link once passed. */
function StepPanel({ flow, step, summary, children }: { flow: Flow; step: CheckoutStep; summary?: string; children: ReactNode }) {
  const current = CHECKOUT_STEPS.indexOf(flow.step);
  const mine = CHECKOUT_STEPS.indexOf(step);
  const open = current === mine;
  const done = mine < current;

  return (
    <section aria-current={open ? "step" : undefined} className="rounded bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className={`font-semibold ${open ? "" : "text-gray-500"}`}>{STEP_LABEL[step]}</h2>
        {done && (
          <button onClick={() => flow.goTo(step)} className="text-sm text-blue-700 hover:underline">
            Change
          </button>
        )}
      </div>
      {done && summary && <p className="mt-1 text-sm text-gray-700">{summary}</p>}
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function AddressStep({ flow }: { flow: Flow }) {
  const { state, retry } = flow.addressBook;
  const [adding, setAdding] = useState(false);

  if (state.status === "loading") return <Spinner label="Loading your addresses…" />;
  if (state.status === "error") return <ErrorView message={state.error.message} onRetry={retry} />;

  const showForm = adding || state.data.length === 0;
  return (
    <div className="space-y-3">
      {state.data.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="sr-only">Choose a shipping address</legend>
          {state.data.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-start gap-2 rounded border p-3 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
              <input type="radio" name="address" checked={flow.addressId === a.id} onChange={() => flow.selectAddress(a.id)} className="mt-1" />
              <span className="text-sm">
                {formatAddress(a)}
                {a.isDefault && <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs text-gray-600">Default</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {showForm ? (
        <NewAddressForm flow={flow} onDone={() => setAdding(false)} canCancel={state.data.length > 0} />
      ) : (
        <button onClick={() => setAdding(true)} className="text-sm text-blue-700 hover:underline">
          + Add a new address
        </button>
      )}
      {!showForm && (
        <ContinueButton disabled={!flow.canContinueFromAddress} onClick={() => flow.goTo("payment")}>
          Use this address
        </ContinueButton>
      )}
    </div>
  );
}

function NewAddressForm({ flow, onDone, canCancel }: { flow: Flow; onDone: () => void; canCancel: boolean }) {
  const form = useAddressForm();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const address = form.validate();
    if (!address) return;
    setSaving(true);
    const result = await flow.addressBook.create(address);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    flow.selectAddress(result.data.id);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded border border-dashed p-3">
      <p className="text-sm font-medium">New address (saved to your address book)</p>
      <AddressFields address={form.address} errors={form.errors} onChange={form.setField} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button disabled={saving} className="rounded-full bg-amber-400 px-5 py-2 text-sm font-medium hover:bg-amber-500 disabled:opacity-60">
          {saving ? "Saving…" : "Save address"}
        </button>
        {canCancel && (
          <button type="button" onClick={onDone} className="text-sm text-blue-700 hover:underline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function PaymentStep({ flow }: { flow: Flow }) {
  const { state, retry } = flow.cards;
  const [adding, setAdding] = useState(false);

  if (state.status === "loading") return <Spinner label="Loading your payment methods…" />;
  if (state.status === "error") return <ErrorView message={state.error.message} onRetry={retry} />;

  const showForm = adding || state.data.length === 0;
  return (
    <div className="space-y-3">
      {state.data.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="sr-only">Choose a payment method</legend>
          {state.data.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded border p-3 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
              <input type="radio" name="card" checked={flow.paymentMethodId === c.id} onChange={() => flow.selectCard(c.id)} />
              <span className="text-sm">
                {cardLabel(c)} · {c.holderName}
                {c.isDefault && <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs text-gray-600">Default</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {showForm ? (
        <NewCardForm flow={flow} onDone={() => setAdding(false)} canCancel={state.data.length > 0} />
      ) : (
        <button onClick={() => setAdding(true)} className="text-sm text-blue-700 hover:underline">
          + Add a card
        </button>
      )}
      {!showForm && (
        <ContinueButton disabled={!flow.canContinueFromPayment} onClick={() => flow.goTo("review")}>
          Use this payment method
        </ContinueButton>
      )}
    </div>
  );
}

function NewCardForm({ flow, onDone, canCancel }: { flow: Flow; onDone: () => void; canCancel: boolean }) {
  const form = useCardForm();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const card = form.validate();
    if (!card) return;
    setSaving(true);
    const result = await flow.cards.create(card);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    form.reset();
    flow.selectCard(result.data.id);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded border border-dashed p-3">
      <p className="text-sm font-medium">New card</p>
      <CardFields fields={form.fields} errors={form.errors} brand={form.brand} onChange={form.setField} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button disabled={saving} className="rounded-full bg-amber-400 px-5 py-2 text-sm font-medium hover:bg-amber-500 disabled:opacity-60">
          {saving ? "Saving…" : "Save card"}
        </button>
        {canCancel && (
          <button type="button" onClick={onDone} className="text-sm text-blue-700 hover:underline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ReviewStep({ flow, onPlace }: { flow: Flow; onPlace: () => void }) {
  const cart = useCart();
  const { state, retry } = flow.quote;
  const [code, setCode] = useState("");
  const submitting = flow.placeOrder.status === "submitting";

  return (
    <div className="space-y-4">
      <ul className="divide-y text-sm">
        {cart?.items.map((i) => (
          <li key={i.productId} className="flex justify-between gap-2 py-2">
            <span>
              {i.quantity} × {i.title}
            </span>
            <span>{formatPrice(i.priceCents * i.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="rounded border p-3">
        {flow.appliedCoupon ? (
          <p className="flex items-center justify-between text-sm">
            <span>
              Coupon <strong>{flow.appliedCoupon}</strong> applied
              {state.status === "success" && state.data?.coupon && <span className="text-gray-600"> · {state.data.coupon.description}</span>}
            </span>
            <button onClick={flow.removeCoupon} className="text-blue-700 hover:underline">
              Remove
            </button>
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void flow.applyCoupon(code);
            }}
            className="flex gap-2"
          >
            <input
              name="coupon"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Coupon code"
              aria-label="Coupon code"
              aria-invalid={Boolean(flow.couponError)}
              className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm uppercase aria-[invalid=true]:border-red-500"
            />
            <button disabled={flow.applying || !code.trim()} className="rounded border border-gray-300 px-4 text-sm hover:bg-gray-50 disabled:opacity-50">
              {flow.applying ? "Checking…" : "Apply"}
            </button>
          </form>
        )}
        {flow.couponError && <p role="alert" className="mt-1 text-sm text-red-700">{flow.couponError}</p>}
      </div>

      {state.status === "loading" && <Spinner label="Calculating your total…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data && (
        <dl className="space-y-1 text-sm">
          <Row label="Items">{formatPrice(state.data.subtotalCents)}</Row>
          {state.data.discountCents > 0 && <Row label="Discount">−{formatPrice(state.data.discountCents)}</Row>}
          <Row label="Shipping">Free</Row>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Order total</dt>
            <dd>{formatPrice(state.data.totalCents)}</dd>
          </div>
        </dl>
      )}

      {flow.placeOrder.status === "error" && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {flow.placeOrder.message}
        </p>
      )}
      <ContinueButton disabled={submitting || state.status !== "success"} onClick={onPlace}>
        {submitting ? "Placing order…" : "Place your order"}
      </ContinueButton>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ContinueButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded-full bg-amber-400 px-6 py-2 font-medium hover:bg-amber-500 disabled:opacity-50">
      {children}
    </button>
  );
}
