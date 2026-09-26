import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import type { SessionUser } from "@/domain/auth";
import { CheckoutError } from "@/domain/checkout";
import { getCurrentUser } from "./dal";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";

const json = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Runs a route handler and maps failures to HTTP: known business errors keep their
 * message; anything unexpected becomes a generic 500 (details go to the server log only).
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof NotFoundError) return json(404, err.message);
    if (err instanceof BadRequestError) return json(400, err.message);
    if (err instanceof ConflictError || err instanceof CheckoutError) return json(409, err.message);
    console.error(err);
    return json(500, "Something went wrong. Please try again.");
  }
}

/** Like `handle`, but 401s unless there's a valid session (checked against the database). */
export function withUser(fn: (user: SessionUser) => Promise<Response>): Promise<Response> {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return json(401, "Please sign in.");
    return fn(user);
  });
}

/**
 * For /api/admin/*: the role is read from the database on every request (getCurrentUser
 * re-reads the user row; nothing is trusted from the JWT but the user id). Non-admins,
 * signed in or not, get a 404 so the admin API isn't advertised.
 */
export function withAdmin(fn: (admin: SessionUser) => Promise<Response>): Promise<Response> {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") return json(404, "Not found");
    return fn(user);
  });
}

export function notFound(message = "Not found") {
  return json(404, message);
}

/** Parses and validates a JSON body; unknown fields are stripped by the schema. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Request body must be JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}
