import { z } from "zod";

/** Admin request bodies. Shapes and bounds only; business rules live in domain/admin.ts. */

export const productBody = z.object({
  title: z.string().max(300),
  description: z.string().max(10000),
  categoryId: z.string().max(60),
  brand: z.string().max(160).default(""),
  priceCents: z.number().int(),
  stock: z.number().int(),
  images: z.array(z.string().max(300)).max(12),
});

export const categoryBody = z.object({
  name: z.string().max(100),
  image: z.string().max(300),
});

const isoDate = z
  .string()
  .max(40)
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date." });
      return z.NEVER;
    }
    return d;
  });

export const couponBody = z.object({
  code: z.string().max(64),
  kind: z.enum(["percent", "fixed"]),
  value: z.number().int(),
  minSubtotalCents: z.number().int().default(0),
  maxDiscountCents: z.number().int().nullable().default(null),
  startsAt: isoDate.default(null),
  expiresAt: isoDate.default(null),
  usageLimit: z.number().int().nullable().default(null),
  oncePerUser: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const orderStatusBody = z.object({ status: z.enum(["pending_payment", "paid", "shipped", "delivered", "cancelled"]) });
export const returnStatusBody = z.object({ status: z.enum(["requested", "approved", "rejected", "refunded"]) });
