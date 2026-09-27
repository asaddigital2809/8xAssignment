import { sql } from "drizzle-orm";
import { boolean, check, customType, index, integer, pgEnum, pgTable, primaryKey, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Auth. `users` and `accounts` follow the Auth.js Drizzle adapter shape; the extra
// user columns (password_hash, role, password_changed_at) are ours.
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  /** Set when the email is confirmed (activation link) or trusted from OAuth. */
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  /** scrypt hash; null for OAuth-only accounts. Never selected into API responses. */
  passwordHash: text("password_hash"),
  role: roleEnum("role").notNull().default("user"),
  /** Sessions issued before this instant are rejected (password change/reset). */
  passwordChangedAt: timestamp("password_changed_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const emailTokenPurpose = pgEnum("email_token_purpose", ["activate", "reset"]);

/** Single-use emailed links. Only a SHA-256 of the token is stored. */
export const emailTokens = pgTable(
  "email_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: emailTokenPurpose("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("email_tokens_hash_idx").on(t.tokenHash), index("email_tokens_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // slug, e.g. "smartphones"
  name: text("name").notNull(),
  image: text("image").notNull(),
});

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brand: text("brand"),
    // Integer cents, same as the domain model.
    priceCents: integer("price_cents").notNull(),
    rating: real("rating").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    thumbnail: text("thumbnail").notNull(),
    images: text("images").array().notNull().default([]),
    /** Number of customer reviews; `rating` is their average, or 0 when there are none. */
    reviewCount: integer("review_count").notNull().default(0),
    /** Archived products stay for order history but are hidden and can't be bought. */
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    // Backstop: the database itself refuses to oversell, whatever the app does.
    check("products_stock_nonnegative", sql`${t.stock} >= 0`),
    check("products_price_nonnegative", sql`${t.priceCents} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// Cart & orders. Every row is owned by a user and every query filters on it.
// ---------------------------------------------------------------------------

/** The cart stores intent only (product + quantity). Prices are always read from `products`. */
export const cartItems = pgTable(
  "cart_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    addedAt: timestamp("added_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] }), check("cart_items_quantity_positive", sql`${t.quantity} > 0`)],
);

/** Saved-for-later products. Like the cart, only intent is stored; price/stock are read live. */
export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const orderStatusEnum = pgEnum("order_status", ["pending_payment", "paid", "shipped", "delivered", "cancelled"]);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    // All amounts computed server-side from `products` at order time (integer cents).
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    // Shipping address snapshot (the address book can change later; the order must not).
    shipName: text("ship_name").notNull(),
    shipLine1: text("ship_line1").notNull(),
    shipCity: text("ship_city").notNull(),
    shipPostalCode: text("ship_postal_code").notNull(),
    shipCountry: text("ship_country").notNull(),
    /** Coupon applied (code snapshot); discountCents above holds what it was worth. */
    couponCode: text("coupon_code"),
    // Payment method snapshot (brand + last4 only; nullable for orders placed before step 4).
    paymentBrand: text("payment_brand"),
    paymentLast4: text("payment_last4"),
    /** Client-generated per checkout attempt; a repeated "Place order" returns the same order. */
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { mode: "date", withTimezone: true }),
    /** Set when the order is marked delivered; starts the return window. */
    deliveredAt: timestamp("delivered_at", { mode: "date", withTimezone: true }),
  },
  (t) => [
    index("orders_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("orders_user_idempotency_idx").on(t.userId, t.idempotencyKey),
    check("orders_amounts_valid", sql`${t.totalCents} >= 0 AND ${t.discountCents} >= 0 AND ${t.totalCents} = ${t.subtotalCents} - ${t.discountCents}`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // restrict: products that were ordered are archived, not deleted (admin, step 8).
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    thumbnail: text("thumbnail").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.productId] }), check("order_items_quantity_positive", sql`${t.quantity} > 0`)],
);

// ---------------------------------------------------------------------------
// Address book & payment methods (owned by a user; every query filters on it)
// ---------------------------------------------------------------------------

export const addresses = pgTable(
  "addresses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    line1: text("line1").notNull(),
    city: text("city").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("addresses_user_idx").on(t.userId),
    // At most one default address per user, enforced by the database.
    uniqueIndex("addresses_one_default_idx").on(t.userId).where(sql`${t.isDefault}`),
  ],
);

/** Mock card on file: brand, last 4 and expiry only. The full number is never stored. */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brand: text("brand").notNull(),
    last4: text("last4").notNull(),
    expMonth: integer("exp_month").notNull(),
    expYear: integer("exp_year").notNull(),
    holderName: text("holder_name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payment_methods_user_idx").on(t.userId),
    uniqueIndex("payment_methods_one_default_idx").on(t.userId).where(sql`${t.isDefault}`),
    check("payment_methods_last4", sql`${t.last4} ~ '^[0-9]{4}$'`),
  ],
);

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export const couponKindEnum = pgEnum("coupon_kind", ["percent", "fixed"]);

export const coupons = pgTable(
  "coupons",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: text("code").notNull().unique(), // stored upper-case
    kind: couponKindEnum("kind").notNull(),
    value: integer("value").notNull(), // percent 1-100, or cents
    minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
    maxDiscountCents: integer("max_discount_cents"),
    startsAt: timestamp("starts_at", { mode: "date", withTimezone: true }),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    usageLimit: integer("usage_limit"), // total redemptions; null = unlimited
    timesUsed: integer("times_used").notNull().default(0),
    oncePerUser: boolean("once_per_user").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("coupons_value_valid", sql`(${t.kind} = 'percent' AND ${t.value} BETWEEN 1 AND 100) OR (${t.kind} = 'fixed' AND ${t.value} > 0)`),
    check("coupons_usage_valid", sql`${t.timesUsed} >= 0 AND (${t.usageLimit} IS NULL OR ${t.timesUsed} <= ${t.usageLimit})`),
  ],
);

/** One row per order that used a coupon. Enforces once-per-user in the database too. */
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    couponId: text("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    oncePerUser: boolean("once_per_user").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.couponId, t.orderId] }),
    uniqueIndex("coupon_redemptions_once_per_user_idx").on(t.couponId, t.userId).where(sql`${t.oncePerUser}`),
  ],
);

// ---------------------------------------------------------------------------
// Returns (owned by the order's user; every query filters on it)
// ---------------------------------------------------------------------------

export const returnStatusEnum = pgEnum("return_status", ["requested", "approved", "rejected", "refunded"]);
export const returnReasonEnum = pgEnum("return_reason", ["damaged", "wrong_item", "not_as_described", "no_longer_needed", "other"]);

export const returns = pgTable(
  "returns",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: returnStatusEnum("status").notNull().default("requested"),
    reason: returnReasonEnum("reason").notNull(),
    comment: text("comment"),
    /** Computed server-side from the order's paid prices (discount pro-rated). */
    refundCents: integer("refund_cents").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("returns_user_idx").on(t.userId, t.createdAt), index("returns_order_idx").on(t.orderId), check("returns_refund_nonnegative", sql`${t.refundCents} >= 0`)],
);

export const returnItems = pgTable(
  "return_items",
  {
    returnId: text("return_id")
      .notNull()
      .references(() => returns.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.returnId, t.productId] }), check("return_items_quantity_positive", sql`${t.quantity} > 0`)],
);

// ---------------------------------------------------------------------------
// Uploads (images stored in Postgres; served by /api/images/:id)
// ---------------------------------------------------------------------------

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const uploadPurposeEnum = pgEnum("upload_purpose", ["review", "product"]);

export const uploads = pgTable(
  "uploads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: uploadPurposeEnum("purpose").notNull(),
    /** Detected from the bytes on upload, never taken from the client. */
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("uploads_owner_idx").on(t.ownerId),
    check("uploads_content_type", sql`${t.contentType} IN ('image/jpeg', 'image/png', 'image/webp')`),
    check("uploads_size", sql`${t.sizeBytes} > 0 AND ${t.sizeBytes} <= 2097152`),
  ],
);

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const reviews = pgTable(
  "reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One review per user per product: resubmitting updates this row.
    uniqueIndex("reviews_product_user_idx").on(t.productId, t.userId),
    index("reviews_product_idx").on(t.productId, t.createdAt),
    check("reviews_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

export const reviewImages = pgTable(
  "review_images",
  {
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    uploadId: text("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.uploadId] }), uniqueIndex("review_images_upload_idx").on(t.uploadId)],
);

export const reviewVotes = pgTable(
  "review_votes",
  {
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.userId] })],
);
