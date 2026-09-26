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

/** A cart line snapshots the product fields it needs so the cart renders without a catalog fetch. */
export type CartItem = {
  productId: string;
  title: string;
  priceCents: number;
  thumbnail: string;
  maxQuantity: number;
  quantity: number;
};

export type Address = {
  fullName: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

export type OrderLine = {
  productId: string;
  title: string;
  priceCents: number;
  thumbnail: string;
  quantity: number;
};

export type Order = {
  id: string;
  placedAt: string;
  lines: OrderLine[];
  address: Address;
  subtotalCents: number;
};

export type ProductQuery = {
  text?: string;
  categoryId?: string;
};
