CREATE TYPE "public"."return_reason" AS ENUM('damaged', 'wrong_item', 'not_as_described', 'no_longer_needed', 'other');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('requested', 'approved', 'rejected', 'refunded');--> statement-breakpoint
CREATE TABLE "return_items" (
	"return_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "return_items_return_id_product_id_pk" PRIMARY KEY("return_id","product_id"),
	CONSTRAINT "return_items_quantity_positive" CHECK ("return_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "return_status" DEFAULT 'requested' NOT NULL,
	"reason" "return_reason" NOT NULL,
	"comment" text,
	"refund_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "returns_refund_nonnegative" CHECK ("returns"."refund_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "returns_user_idx" ON "returns" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "returns_order_idx" ON "returns" USING btree ("order_id");