import "server-only";
import { sql } from "drizzle-orm";
import { products } from "@/db/schema";

/** Stock a customer can actually buy: archived products count as 0. */
export const availableStock = sql<number>`CASE WHEN ${products.archived} THEN 0 ELSE ${products.stock} END`.mapWith(Number);
