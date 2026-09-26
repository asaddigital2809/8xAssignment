import "server-only";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db, withTransaction } from "@/db/client";
import { addresses } from "@/db/schema";
import { isValid, validateAddress } from "@/domain/checkout";
import type { Address, SavedAddress } from "@/domain/types";
import { BadRequestError, NotFoundError } from "./errors";

type Row = typeof addresses.$inferSelect;

const toSaved = (r: Row): SavedAddress => ({
  id: r.id,
  fullName: r.fullName,
  line1: r.line1,
  city: r.city,
  postalCode: r.postalCode,
  country: r.country,
  isDefault: r.isDefault,
});

function clean(input: Address): Address {
  if (!isValid(validateAddress(input))) throw new BadRequestError("The address is incomplete.");
  return {
    fullName: input.fullName.trim(),
    line1: input.line1.trim(),
    city: input.city.trim(),
    postalCode: input.postalCode.trim(),
    country: input.country.trim(),
  };
}

const owned = (userId: string, id: string) => and(eq(addresses.id, id), eq(addresses.userId, userId));

export async function listAddresses(userId: string): Promise<SavedAddress[]> {
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
  return rows.map(toSaved);
}

/** Someone else's address is indistinguishable from a missing one (404). */
export async function getAddress(userId: string, id: string): Promise<SavedAddress> {
  const [row] = await db.select().from(addresses).where(owned(userId, id)).limit(1);
  if (!row) throw new NotFoundError("Address not found.");
  return toSaved(row);
}

/** The user's first address becomes the default automatically. */
export async function createAddress(userId: string, input: Address, makeDefault = false): Promise<SavedAddress> {
  const values = clean(input);
  return withTransaction(async (tx) => {
    const [existing] = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, userId)).limit(1);
    const isDefault = makeDefault || !existing;
    if (isDefault) await tx.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
    const [row] = await tx.insert(addresses).values({ ...values, userId, isDefault }).returning();
    return toSaved(row);
  });
}

export async function updateAddress(userId: string, id: string, input: Address): Promise<SavedAddress> {
  const [row] = await db.update(addresses).set(clean(input)).where(owned(userId, id)).returning();
  if (!row) throw new NotFoundError("Address not found.");
  return toSaved(row);
}

export async function setDefaultAddress(userId: string, id: string): Promise<SavedAddress[]> {
  await withTransaction(async (tx) => {
    const [target] = await tx.select({ id: addresses.id }).from(addresses).where(owned(userId, id)).for("update");
    if (!target) throw new NotFoundError("Address not found.");
    await tx.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, userId), ne(addresses.id, id)));
    await tx.update(addresses).set({ isDefault: true }).where(owned(userId, id));
  });
  return listAddresses(userId);
}

/** Deleting the default promotes the most recently added remaining address. */
export async function deleteAddress(userId: string, id: string): Promise<SavedAddress[]> {
  await withTransaction(async (tx) => {
    const [deleted] = await tx.delete(addresses).where(owned(userId, id)).returning();
    if (!deleted) throw new NotFoundError("Address not found.");
    if (deleted.isDefault) {
      const [next] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.createdAt))
        .limit(1);
      if (next) await tx.update(addresses).set({ isDefault: true }).where(owned(userId, next.id));
    }
  });
  return listAddresses(userId);
}
