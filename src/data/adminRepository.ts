import type {
  AdminCategoryRow,
  AdminCoupon,
  AdminOrderDetail,
  AdminOrderRow,
  AdminOverview,
  AdminProductRow,
  CategoryInput,
  ProductInput,
} from "@/domain/admin";
import type { ReturnStatus } from "@/domain/returns";
import type { OrderStatus } from "@/domain/types";
import { getJson, sendJson, uploadFile } from "./http";

/** Coupon as sent to the API (dates as ISO strings). */
export type CouponPayload = Omit<AdminCoupon, "id" | "timesUsed">;

const enc = encodeURIComponent;

export const adminRepository = {
  overview: (signal?: AbortSignal) => getJson<AdminOverview>("/api/admin/overview", signal),

  orders: (filter: { status?: OrderStatus; q?: string }, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.q) params.set("q", filter.q);
    return getJson<AdminOrderRow[]>(`/api/admin/orders?${params}`, signal);
  },
  order: (id: string, signal?: AbortSignal) => getJson<AdminOrderDetail>(`/api/admin/orders/${enc(id)}`, signal),
  setOrderStatus: (id: string, status: OrderStatus) => sendJson<AdminOrderDetail>("PATCH", `/api/admin/orders/${enc(id)}`, { status }),
  setReturnStatus: (id: string, status: ReturnStatus) => sendJson<AdminOrderDetail>("PATCH", `/api/admin/returns/${enc(id)}`, { status }),

  products: (q: string, signal?: AbortSignal) => getJson<AdminProductRow[]>(`/api/admin/products?q=${enc(q)}`, signal),
  product: (id: string, signal?: AbortSignal) => getJson<AdminProductRow>(`/api/admin/products/${enc(id)}`, signal),
  createProduct: (input: ProductInput) => sendJson<AdminProductRow>("POST", "/api/admin/products", input),
  updateProduct: (id: string, input: ProductInput) => sendJson<AdminProductRow>("PUT", `/api/admin/products/${enc(id)}`, input),
  deleteProduct: (id: string) => sendJson<{ result: "deleted" | "archived" }>("DELETE", `/api/admin/products/${enc(id)}`),
  restoreProduct: (id: string) => sendJson<AdminProductRow>("POST", `/api/admin/products/${enc(id)}/restore`),

  categories: (signal?: AbortSignal) => getJson<AdminCategoryRow[]>("/api/admin/categories", signal),
  createCategory: (input: CategoryInput) => sendJson<AdminCategoryRow>("POST", "/api/admin/categories", input),
  updateCategory: (id: string, input: CategoryInput) => sendJson<AdminCategoryRow>("PUT", `/api/admin/categories/${enc(id)}`, input),
  deleteCategory: (id: string) => sendJson<{ ok: true }>("DELETE", `/api/admin/categories/${enc(id)}`),

  coupons: (signal?: AbortSignal) => getJson<AdminCoupon[]>("/api/admin/coupons", signal),
  createCoupon: (input: CouponPayload) => sendJson<AdminCoupon>("POST", "/api/admin/coupons", input),
  updateCoupon: (id: string, input: CouponPayload) => sendJson<AdminCoupon>("PUT", `/api/admin/coupons/${enc(id)}`, input),
  deleteCoupon: (id: string) => sendJson<{ ok: true }>("DELETE", `/api/admin/coupons/${enc(id)}`),

  uploadImage: (file: File) => uploadFile<{ id: string; url: string }>("/api/admin/uploads", file),
};
