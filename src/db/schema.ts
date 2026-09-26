import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, primaryKey, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
    /** Client-generated per checkout attempt; a repeated "Place order" returns the same order. */
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { mode: "date", withTimezone: true }),
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
