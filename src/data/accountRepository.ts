import type { CardInput, PaymentMethod } from "@/domain/payment";
import type { Address, SavedAddress } from "@/domain/types";
import { getJson, sendJson } from "./http";

const address = (id: string) => `/api/addresses/${encodeURIComponent(id)}`;
const card = (id: string) => `/api/payment-methods/${encodeURIComponent(id)}`;

export const addressRepository = {
  list: (signal?: AbortSignal) => getJson<SavedAddress[]>("/api/addresses", signal),
  create: (input: Address, makeDefault = false) => sendJson<SavedAddress>("POST", "/api/addresses", { ...input, makeDefault }),
  update: (id: string, input: Address) => sendJson<SavedAddress>("PATCH", address(id), input),
  remove: (id: string) => sendJson<SavedAddress[]>("DELETE", address(id)),
  setDefault: (id: string) => sendJson<SavedAddress[]>("POST", `${address(id)}/default`),
};

export const paymentMethodRepository = {
  list: (signal?: AbortSignal) => getJson<PaymentMethod[]>("/api/payment-methods", signal),
  /** The number goes to the server once for validation; only brand/last4/expiry come back. */
  create: (input: CardInput, makeDefault = false) => sendJson<PaymentMethod>("POST", "/api/payment-methods", { ...input, makeDefault }),
  remove: (id: string) => sendJson<PaymentMethod[]>("DELETE", card(id)),
  setDefault: (id: string) => sendJson<PaymentMethod[]>("POST", `${card(id)}/default`),
};
