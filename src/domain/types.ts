export type Category = {
  id: string;
  name: string;
  image: string;
};

export type Product = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  brand?: string;
  /** Prices are integer cents to avoid floating-point rounding in totals. */
  priceCents: number;
  rating: number;
  stock: number;
  thumbnail: string;
  images: string[];
};

/** A cart line as served by the API: product fields and price are read live from the catalog. */
export type CartItem = {
  productId: string;
  title: string;
  priceCents: number;
  thumbnail: string;
  maxQuantity: number;
  quantity: number;
};

export type Cart = {
  items: CartItem[];
  subtotalCents: number;
};

export type Address = {
  fullName: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

export type SavedAddress = Address & { id: string; isDefault: boolean };

export type OrderLine = {
  productId: string;
  title: string;
  priceCents: number;
  thumbnail: string;
  quantity: number;
};

export type OrderStatus = "pending_payment" | "paid" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  status: OrderStatus;
  placedAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  lines: OrderLine[];
  address: Address;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  payment: { brand: string; last4: string } | null;
};

/** Server-computed price breakdown for the review step. */
export type CheckoutQuote = {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  coupon: { code: string; description: string } | null;
  /** Set when a coupon code was given but doesn't apply; the quote is then without it. */
  couponError: string | null;
};

export type ProductQuery = {
  text?: string;
  categoryId?: string;
};
