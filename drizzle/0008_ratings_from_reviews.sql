-- A product's rating is the average of its customer reviews, or 0 when it has none.
-- The catalog import had copied the source dataset's ratings; recompute everything from reviews.
UPDATE "products" p SET
  "rating" = COALESCE((SELECT round(avg(r."rating")::numeric, 1)::real FROM "reviews" r WHERE r."product_id" = p."id"), 0),
  "review_count" = (SELECT count(*)::int FROM "reviews" r WHERE r."product_id" = p."id");
