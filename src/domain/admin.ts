import { COUPON_CODE_PATTERN, type CouponKind } from "./coupon";
import type { ReturnRequestView, ReturnStatus } from "./returns";
import type { Category, Order, OrderStatus, Product } from "./types";

// ---------------------------------------------------------------------------
// Admin view models
// ---------------------------------------------------------------------------

export type AdminCustomer = { name: string | null; email: string };

export type AdminOrderRow = {
  id: string;
  status: OrderStatus;
  placedAt: string;
  totalCents: number;
  itemCount: number;
  customer: AdminCustomer;
};

export type AdminOrderDetail = Order & { customer: AdminCustomer; returns: ReturnRequestView[] };

export type AdminProductRow = Product & { archived: boolean };

export type AdminCategoryRow = Category & { productCount: number };

export type AdminCoupon = {
  id: string;
  code: string;
  kind: CouponKind;
  value: number;
  minSubtotalCents: number;
  maxDiscountCents: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  timesUsed: number;
  oncePerUser: boolean;
  active: boolean;
};

export type AdminOverview = {
  ordersByStatus: Record<OrderStatus, number>;
  revenueCents: number;
  openReturns: number;
  lowStock: { id: string; title: string; stock: number }[];
  recentOrders: AdminOrderRow[];
};

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/**
 * What an admin may move an order to. "paid" is never set by an admin (only by the
 * customer's payment), and delivered/cancelled are final.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["refunded"],
  rejected: [],
  refunded: [],
};

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Money & slugs
// ---------------------------------------------------------------------------

/** "12", "12.5", "12.34", "$1,299.99" -> cents; null if not a valid non-negative amount. */
export function parseMoneyToCents(input: string): number | null {
  const s = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// ---------------------------------------------------------------------------
// Admin form inputs
// ---------------------------------------------------------------------------

export type ProductInput = {
  title: string;
  description: string;
  categoryId: string;
  brand: string;
  priceCents: number;
  stock: number;
  images: string[];
};

export const PRODUCT_MAX_IMAGES = 6;

/** Images must be our own uploads or the catalog CDN; nothing else is rendered. */
export function isAllowedImageUrl(url: string): boolean {
  return /^\/api\/images\/[0-9a-f-]{36}$/.test(url) || /^https:\/\/cdn\.dummyjson\.com\/[\w\-./]+$/.test(url);
}

export function validateProduct(p: ProductInput): Partial<Record<keyof ProductInput, string>> {
  const e: Partial<Record<keyof ProductInput, string>> = {};
  if (p.title.trim().length < 2 || p.title.trim().length > 150) e.title = "Title must be 2–150 characters.";
  if (p.description.trim().length < 10 || p.description.trim().length > 5000) e.description = "Description must be 10–5000 characters.";
  if (!/^[a-z0-9-]{1,50}$/.test(p.categoryId)) e.categoryId = "Choose a category.";
  if (p.brand.trim().length > 80) e.brand = "Brand must be at most 80 characters.";
  if (!Number.isInteger(p.priceCents) || p.priceCents <= 0 || p.priceCents > 100_000_000) e.priceCents = "Enter a price between $0.01 and $1,000,000.";
  if (!Number.isInteger(p.stock) || p.stock < 0 || p.stock > 1_000_000) e.stock = "Stock must be a whole number from 0 to 1,000,000.";
  if (p.images.length === 0) e.images = "Add at least one image.";
  else if (p.images.length > PRODUCT_MAX_IMAGES) e.images = `At most ${PRODUCT_MAX_IMAGES} images.`;
  else if (!p.images.every(isAllowedImageUrl)) e.images = "Images must be uploaded here.";
  return e;
}

export type CategoryInput = { name: string; image: string };

export function validateCategory(c: CategoryInput): Partial<Record<keyof CategoryInput, string>> {
  const e: Partial<Record<keyof CategoryInput, string>> = {};
  if (c.name.trim().length < 2 || c.name.trim().length > 50) e.name = "Name must be 2–50 characters.";
  else if (!slugify(c.name)) e.name = "Use letters or numbers in the name.";
  if (!c.image) e.image = "Add an image for the category tile.";
  else if (!isAllowedImageUrl(c.image)) e.image = "Images must be uploaded here.";
  return e;
}

export type CouponInput = {
  code: string;
  kind: CouponKind;
  value: number; // percent 1-100, or cents
  minSubtotalCents: number;
  maxDiscountCents: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  oncePerUser: boolean;
  active: boolean;
};

export function validateCoupon(c: CouponInput): Partial<Record<keyof CouponInput, string>> {
  const e: Partial<Record<keyof CouponInput, string>> = {};
  if (!COUPON_CODE_PATTERN.test(c.code)) e.code = "3–32 characters: A–Z, 0–9, _ or -.";
  if (c.kind === "percent" && (!Number.isInteger(c.value) || c.value < 1 || c.value > 100)) e.value = "Percent off must be 1–100.";
  if (c.kind === "fixed" && (!Number.isInteger(c.value) || c.value < 1)) e.value = "Enter an amount off.";
  if (!Number.isInteger(c.minSubtotalCents) || c.minSubtotalCents < 0) e.minSubtotalCents = "Minimum must be 0 or more.";
  if (c.maxDiscountCents !== null && (!Number.isInteger(c.maxDiscountCents) || c.maxDiscountCents < 1)) e.maxDiscountCents = "Cap must be more than 0.";
  if (c.usageLimit !== null && (!Number.isInteger(c.usageLimit) || c.usageLimit < 1)) e.usageLimit = "Limit must be at least 1.";
  if (c.startsAt && c.expiresAt && c.expiresAt <= c.startsAt) e.expiresAt = "Must end after it starts.";
  return e;
}
