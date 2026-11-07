import { useCallback, useEffect, useState } from "react";
import type { ApiErrorBody, Health } from "../../shared/contract.ts";
import { accessToken } from "../auth/supabase.ts";

/** An API failure with a sentence for the user and, when relevant, a recovery hint. */
export class ApiError extends Error {
  code?: ApiErrorBody["code"];
  constructor(message: string, code?: ApiErrorBody["code"]) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // Signed-in scouts send their Supabase session so the API can check it.
    const token = await accessToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError("Can't reach the server. Is `npm run dev` running?");
  }
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const { error, code } = body as Partial<ApiErrorBody>;
    throw new ApiError(error ?? `Request failed (${res.status})`, code);
  }
  return body as T;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>(path);

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/**
 * POST to a streaming AI route: progress lines arrive while the web is searched, then the result.
 * Validation errors (400/503) still come back as ordinary JSON.
 */
export async function apiStream<T>(path: string, body: unknown, onProgress?: (line: string) => void, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    const token = await accessToken();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body), signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError("Can't reach the server. Is `npm run dev` running?");
  }
  if (!res.ok || !res.body) {
    const { error, code } = (await res.json().catch(() => ({}))) as Partial<ApiErrorBody>;
    throw new ApiError(error ?? `Request failed (${res.status})`, code);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += value;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line) as { type: "progress"; line: string } | { type: "result"; data: T } | { type: "error"; error: string; code?: ApiErrorBody["code"] };
      if (msg.type === "progress") onProgress?.(msg.line);
      else if (msg.type === "result") return msg.data;
      else throw new ApiError(msg.error, msg.code);
    }
    if (done) throw new ApiError("The connection closed before the search finished. Try again.");
  }
}

export const asApiError = (err: unknown): ApiError => (err instanceof ApiError ? err : new ApiError((err as Error).message));

const getCache = new Map<string, Promise<unknown>>();

/** GET once per page load; components asking for the same path share one request. */
export function useFetch<T>(path: string): { data?: T; error?: string } {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  useEffect(() => {
    let cancelled = false;
    if (!getCache.has(path)) getCache.set(path, apiGet<T>(path));
    (getCache.get(path) as Promise<T>).then(
      (data) => !cancelled && setState({ data }),
      (err: Error) => !cancelled && setState({ error: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [path]);
  return state;
}

export const useHealth = (): Health | undefined => useFetch<Health>("/api/health").data;

/** Wrap an async call with loading / error / result state. */
export function useAction<Args extends unknown[], T>(fn: (...args: Args) => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: ApiError; loading: boolean }>({ loading: false });

  const run = useCallback(
    async (...args: Args) => {
      setState((s) => ({ data: s.data, loading: true }));
      try {
        setState({ data: await fn(...args), loading: false });
      } catch (err) {
        setState({ error: asApiError(err), loading: false });
      }
    },
    [fn],
  );

  return { ...state, run };
}
