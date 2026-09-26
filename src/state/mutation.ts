"use client";

import { UnauthorizedError } from "@/data/http";
import { redirectToSignIn } from "./navigation";

export type MutationResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Runs a write, turning failures into a user-facing message; a dead session goes to sign-in. */
export async function attempt<T>(fn: () => Promise<T>): Promise<MutationResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof UnauthorizedError) redirectToSignIn();
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
