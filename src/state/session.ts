"use client";

import { useCartStore } from "./cartStore";

/**
 * Whether a user is signed in, as learned by SessionDataLoader (the server-rendered
 * header passes the user id down). undefined while it's still loading. UI hint only:
 * every API call is authorized on the server regardless.
 */
export function useSignedIn(): boolean | undefined {
  const status = useCartStore((s) => s.status);
  if (status === "loading") return undefined;
  return status !== "signed-out";
}
