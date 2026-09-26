import { z } from "zod";

/** Request shapes shared by several route handlers. Lengths are bounded; content is validated in services. */
export const addressBody = z.object({
  fullName: z.string().max(100),
  line1: z.string().max(200),
  city: z.string().max(100),
  postalCode: z.string().max(20),
  country: z.string().max(100),
});
