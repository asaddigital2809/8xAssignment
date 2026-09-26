import "server-only";
import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  return url;
}

/**
 * Default client: Neon's HTTP driver. Each query is a stateless fetch, so there are no
 * long-lived sockets to go stale between requests (a pooled WebSocket client dropped
 * idle connections and failed requests intermittently).
 */
export const db = drizzleHttp({ client: neon(databaseUrl()), schema });

type TxDb = ReturnType<typeof drizzleWs<typeof schema>>;
export type Tx = Parameters<Parameters<TxDb["transaction"]>[0]>[0];

/**
 * Interactive transaction over a WebSocket pool that lives only for this call.
 * Used where correctness needs row locks / read-then-write (e.g. checkout).
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    return await drizzleWs({ client: pool, schema }).transaction(fn);
  } finally {
    await pool.end();
  }
}
