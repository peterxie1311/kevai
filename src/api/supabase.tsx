import {
  baseUrl,
  request,
  resource,
  type Query,
  type RequestOptions,
} from "./http";
export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  /** Supply a fresh session JWT on each call; this module does not persist tokens. */
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
}
export function createSupabaseClient(
  config: SupabaseConfig,
  fetcher: typeof fetch = fetch,
) {
  const root = baseUrl(config.url);
  if (!config.publishableKey.startsWith("sb_publishable_"))
    throw new Error("A Supabase publishable key is required");
  async function call<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const token = await config.getAccessToken?.();
    const headers = new Headers(options.headers);
    headers.set("apikey", config.publishableKey);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return request<T>(`${root}/${path}`, { ...options, headers }, fetcher);
  }
  function filtered(filters: Query): Query {
    if (
      !Object.keys(filters).some(
        (k) =>
          !["select", "order", "limit", "offset"].includes(k) &&
          filters[k] !== undefined,
      )
    ) {
      throw new Error(
        "Update/delete requires at least one explicit row filter",
      );
    }
    return filters;
  }
  return {
    select: <T,>(table: string, query: Query = {}, signal?: AbortSignal) =>
      call<T[]>(`rest/v1/${resource(table)}`, {
        query: { select: "*", ...query },
        signal,
      }),
    insert: <T,>(table: string, rows: unknown, signal?: AbortSignal) =>
      call<T[]>(`rest/v1/${resource(table)}`, {
        method: "POST",
        body: rows,
        headers: { Prefer: "return=representation" },
        signal,
      }),
    update: <T,>(
      table: string,
      values: unknown,
      filters: Query,
      signal?: AbortSignal,
    ) =>
      call<T[]>(`rest/v1/${resource(table)}`, {
        method: "PATCH",
        body: values,
        query: filtered(filters),
        headers: { Prefer: "return=representation" },
        signal,
      }),
    remove: <T,>(table: string, filters: Query, signal?: AbortSignal) =>
      call<T[]>(`rest/v1/${resource(table)}`, {
        method: "DELETE",
        query: filtered(filters),
        headers: { Prefer: "return=representation" },
        signal,
      }),
    rpc: <T,>(
      name: string,
      args: Record<string, unknown> = {},
      signal?: AbortSignal,
    ) =>
      call<T>(`rest/v1/rpc/${resource(name)}`, {
        method: "POST",
        body: args,
        signal,
      }),
    invoke: <T,>(name: string, body: unknown, signal?: AbortSignal) =>
      call<T>(`functions/v1/${resource(name)}`, {
        method: "POST",
        body,
        signal,
      }),
  };
}
