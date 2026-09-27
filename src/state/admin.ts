"use client";

import { useState } from "react";
import { adminRepository as repo, type CouponPayload } from "@/data/adminRepository";
import {
  centsToInput,
  parseMoneyToCents,
  PRODUCT_MAX_IMAGES,
  validateCoupon,
  validateProduct,
  type AdminCoupon,
  type AdminProductRow,
  type CategoryInput,
  type CouponInput,
  type ProductInput,
} from "@/domain/admin";
import type { CouponKind } from "@/domain/coupon";
import type { OrderStatus } from "@/domain/types";
import { attempt } from "./mutation";
import { useAsync } from "./useAsync";

export const useAdminOverview = () => useAsync("admin:overview", (s) => repo.overview(s));
export const useAdminOrders = (status: OrderStatus | undefined, q: string) =>
  useAsync(`admin:orders:${status ?? ""}:${q}`, (s) => repo.orders({ status, q }, s));
export const useAdminOrder = (id: string) => useAsync(`admin:order:${id}`, (s) => repo.order(id, s));
export const useAdminProducts = (q: string) => useAsync(`admin:products:${q}`, (s) => repo.products(q, s));
export const useAdminProduct = (id: string) => useAsync(`admin:product:${id}`, (s) => repo.product(id, s));
export const useAdminCategories = () => useAsync("admin:categories", (s) => repo.categories(s));
export const useAdminCoupons = () => useAsync("admin:coupons", (s) => repo.coupons(s));

/** Image list with upload (shared by product and category forms). */
export function useImageUploads(initial: string[], max: number) {
  const [images, setImages] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  async function add(file: File) {
    if (images.length >= max) return setError(`At most ${max} image${max === 1 ? "" : "s"}.`);
    setUploading(true);
    const result = await attempt(() => repo.uploadImage(file));
    setUploading(false);
    if (!result.ok) return setError(result.error);
    setError(undefined);
    setImages((list) => [...list, result.data.url]);
  }

  return {
    images,
    uploading,
    error,
    add,
    remove: (url: string) => setImages((list) => list.filter((u) => u !== url)),
    /** Moves an image to the front: the first image is the product's thumbnail. */
    makePrimary: (url: string) => setImages((list) => [url, ...list.filter((u) => u !== url)]),
    replaceAll: setImages,
  };
}

type ProductFields = { title: string; description: string; categoryId: string; brand: string; price: string; stock: string };

/** Product create/edit form. Price is typed as text and parsed to exact cents. */
export function useProductForm(initial?: AdminProductRow) {
  const [fields, setFields] = useState<ProductFields>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    categoryId: initial?.categoryId ?? "",
    brand: initial?.brand ?? "",
    price: initial ? centsToInput(initial.priceCents) : "",
    stock: initial ? String(initial.stock) : "0",
  });
  const images = useImageUploads(initial?.images ?? [], PRODUCT_MAX_IMAGES);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const priceCents = parseMoneyToCents(fields.price);
  const input: ProductInput = {
    title: fields.title,
    description: fields.description,
    categoryId: fields.categoryId,
    brand: fields.brand,
    priceCents: priceCents ?? 0,
    stock: /^\d+$/.test(fields.stock.trim()) ? Number(fields.stock) : -1,
    images: images.images,
  };
  const errors = submitted ? validateProduct(input) : {};

  async function save(): Promise<AdminProductRow | undefined> {
    setSubmitted(true);
    if (Object.keys(validateProduct(input)).length > 0) return undefined;
    setSaving(true);
    const result = await attempt(() => (initial ? repo.updateProduct(initial.id, input) : repo.createProduct(input)));
    setSaving(false);
    setError(result.ok ? undefined : result.error);
    return result.ok ? result.data : undefined;
  }

  return {
    fields,
    setField: (f: keyof ProductFields, v: string) => setFields((s) => ({ ...s, [f]: v })),
    images,
    errors,
    error,
    saving,
    save,
  };
}

/** Category create/edit (one image). */
export function useCategoryForm(initial?: { id: string; name: string; image: string }) {
  const [name, setName] = useState(initial?.name ?? "");
  const images = useImageUploads(initial?.image ? [initial.image] : [], 1);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    const input: CategoryInput = { name, image: images.images[0] ?? "" };
    setSaving(true);
    const result = await attempt(() => (initial ? repo.updateCategory(initial.id, input) : repo.createCategory(input)));
    setSaving(false);
    setError(result.ok ? undefined : result.error);
    return result.ok;
  }

  return { name, setName, images, error, saving, save };
}

type CouponFields = {
  code: string;
  kind: CouponKind;
  value: string; // percent, or dollars for fixed
  minSubtotal: string;
  maxDiscount: string;
  startsAt: string; // yyyy-mm-dd
  expiresAt: string;
  usageLimit: string;
  oncePerUser: boolean;
  active: boolean;
};

const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** Coupon create/edit. Amounts typed in dollars, sent as cents; dates as whole days (UTC). */
export function useCouponForm(initial?: AdminCoupon) {
  const [fields, setFields] = useState<CouponFields>({
    code: initial?.code ?? "",
    kind: initial?.kind ?? "percent",
    value: initial ? (initial.kind === "percent" ? String(initial.value) : centsToInput(initial.value)) : "",
    minSubtotal: initial ? centsToInput(initial.minSubtotalCents) : "0",
    maxDiscount: initial?.maxDiscountCents != null ? centsToInput(initial.maxDiscountCents) : "",
    startsAt: dateInput(initial?.startsAt ?? null),
    expiresAt: dateInput(initial?.expiresAt ?? null),
    usageLimit: initial?.usageLimit != null ? String(initial.usageLimit) : "",
    oncePerUser: initial?.oncePerUser ?? false,
    active: initial?.active ?? true,
  });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  function toInput(): CouponInput | string {
    const value = fields.kind === "percent" ? (/^\d+$/.test(fields.value.trim()) ? Number(fields.value) : NaN) : parseMoneyToCents(fields.value);
    const minSubtotalCents = parseMoneyToCents(fields.minSubtotal || "0");
    const maxDiscountCents = fields.maxDiscount.trim() ? parseMoneyToCents(fields.maxDiscount) : null;
    const usageLimit = fields.usageLimit.trim() ? Number(fields.usageLimit) : null;
    if (value === null || Number.isNaN(value)) return fields.kind === "percent" ? "Enter a whole percent." : "Enter an amount like 5 or 5.99.";
    if (minSubtotalCents === null) return "Enter a valid minimum order amount.";
    if (fields.maxDiscount.trim() && maxDiscountCents === null) return "Enter a valid maximum discount.";
    const input: CouponInput = {
      code: fields.code.trim().toUpperCase(),
      kind: fields.kind,
      value,
      minSubtotalCents,
      maxDiscountCents,
      startsAt: fields.startsAt ? new Date(`${fields.startsAt}T00:00:00Z`) : null,
      expiresAt: fields.expiresAt ? new Date(`${fields.expiresAt}T23:59:59Z`) : null,
      usageLimit,
      oncePerUser: fields.oncePerUser,
      active: fields.active,
    };
    const first = Object.values(validateCoupon(input)).find(Boolean);
    return first ?? input;
  }

  async function save() {
    const input = toInput();
    if (typeof input === "string") {
      setError(input);
      return false;
    }
    const payload: CouponPayload = {
      ...input,
      startsAt: input.startsAt?.toISOString() ?? null,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    };
    setSaving(true);
    const result = await attempt(() => (initial ? repo.updateCoupon(initial.id, payload) : repo.createCoupon(payload)));
    setSaving(false);
    setError(result.ok ? undefined : result.error);
    return result.ok;
  }

  return {
    fields,
    setField: <K extends keyof CouponFields>(f: K, v: CouponFields[K]) => setFields((s) => ({ ...s, [f]: v })),
    error,
    saving,
    save,
  };
}
