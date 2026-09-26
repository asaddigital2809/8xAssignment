"use client";

import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: T };

const LOADING = { status: "loading" } as const;

/**
 * Runs `load` whenever `key` changes and exposes loading/error/success plus a retry.
 * Each result is tagged with the request that produced it, so a result for an older key
 * (e.g. a slow search superseded by typing) is never shown. Loading is derived rather
 * than set, which avoids a synchronous setState in the effect.
 */
export function useAsync<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${key}#${attempt}`;
  const [settled, setSettled] = useState<{ requestKey: string; state: AsyncState<T> } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ requestKey, state: { status: "success", data } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setSettled({ requestKey, state: { status: "error", error: err } });
      },
    );
    return () => controller.abort();
    // `load` is intentionally excluded: callers pass inline closures, and `key` captures their inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const state: AsyncState<T> = settled?.requestKey === requestKey ? settled.state : LOADING;
  return { state, retry };
}
