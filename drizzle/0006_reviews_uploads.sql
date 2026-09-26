CREATE TYPE "public"."upload_purpose" AS ENUM('review', 'product');--> statement-breakpoint
CREATE TABLE "review_images" (
	"review_id" text NOT NULL,
	"upload_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "review_images_review_id_upload_id_pk" PRIMARY KEY("review_id","upload_id")
);
--> statement-breakpoint
CREATE TABLE "review_votes" (
	"review_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_votes_review_id_user_id_pk" PRIMARY KEY("review_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"purpose" "upload_purpose" NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uploads_content_type" CHECK ("uploads"."content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "uploads_size" CHECK ("uploads"."size_bytes" > 0 AND "uploads"."size_bytes" <= 2097152)
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "review_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_images_upload_idx" ON "review_images" USING btree ("upload_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_product_user_idx" ON "reviews" USING btree ("product_id","user_id");--> statement-breakpoint
CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "uploads_owner_idx" ON "uploads" USING btree ("owner_id");