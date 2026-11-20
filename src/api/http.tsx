export type Query = Record<string, string | number | boolean | undefined>;
export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
/** One attempt per call: writes and paid AI calls are never silently retried. */
export async function request<T>(
  url: string,
  options: RequestOptions = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) target.searchParams.set(key, String(value));
  }
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error("timeoutMs must be positive");
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs,
  );
  try {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body !== undefined)
      headers.set("Content-Type", "application/json");
    const response = await fetcher(target, {
      method: options.method ?? "GET",
      headers,
      signal: controller.signal,
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    });
    const text = await response.text();
    let data: unknown = undefined;
    let parsed = true;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
        parsed = false;
      }
    }
    if (!response.ok)
      throw new ApiError(
        `API request failed (${response.status})`,
        response.status,
        data,
      );
    if (
      text &&
      !parsed &&
      !response.headers.get("content-type")?.includes("text/")
    ) {
      throw new ApiError("Expected a JSON response", response.status, data);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export function baseUrl(value: string): string {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Use an HTTP(S) base URL without credentials, query, or fragment",
    );
  }
  return value.replace(/\/+$/, "");
}
export function resource(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value))
    throw new Error("Invalid resource name");
  return value;
}
