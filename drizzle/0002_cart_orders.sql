CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'paid', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "cart_items" (
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_user_id_product_id_pk" PRIMARY KEY("user_id","product_id"),
	CONSTRAINT "cart_items_quantity_positive" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"title" text NOT NULL,
	"thumbnail" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "order_items_order_id_product_id_pk" PRIMARY KEY("order_id","product_id"),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"ship_name" text NOT NULL,
	"ship_line1" text NOT NULL,
	"ship_city" text NOT NULL,
	"ship_postal_code" text NOT NULL,
	"ship_country" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "orders_amounts_valid" CHECK ("orders"."total_cents" >= 0 AND "orders"."discount_cents" >= 0 AND "orders"."total_cents" = "orders"."subtotal_cents" - "orders"."discount_cents")
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_user_idempotency_idx" ON "orders" USING btree ("user_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_stock_nonnegative" CHECK ("products"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_price_nonnegative" CHECK ("products"."price_cents" >= 0);