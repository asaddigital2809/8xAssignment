import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { uploads } from "@/db/schema";
import { sniffImageType, uploadProblem } from "@/domain/uploads";
import { BadRequestError, NotFoundError } from "./errors";

export type UploadPurpose = "review" | "product";
export type UploadedImage = { id: string; url: string };

export const imageUrl = (id: string) => `/api/images/${id}`;

/**
 * Stores an image. The type is detected from the bytes (never the client's claim), and
 * only JPEG/PNG/WebP up to 2 MB are accepted, so nothing can later be served as HTML/SVG.
 */
export async function createUpload(ownerId: string, purpose: UploadPurpose, bytes: Uint8Array): Promise<UploadedImage> {
  const problem = uploadProblem(bytes);
  if (problem) throw new BadRequestError(problem);
  const [row] = await db
    .insert(uploads)
    .values({ ownerId, purpose, contentType: sniffImageType(bytes)!, sizeBytes: bytes.length, data: Buffer.from(bytes) })
    .returning({ id: uploads.id });
  return { id: row.id, url: imageUrl(row.id) };
}

export async function getImage(id: string): Promise<{ contentType: string; data: Buffer }> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new NotFoundError("Image not found.");
  const [row] = await db.select({ contentType: uploads.contentType, data: uploads.data }).from(uploads).where(eq(uploads.id, id)).limit(1);
  if (!row) throw new NotFoundError("Image not found.");
  return row;
}
