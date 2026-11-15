import { baseUrl, request, resource, type Query } from './http';
export interface NbaResultSet { name: string; headers: string[]; rowSet: unknown[][] }
export interface NbaStatsResponse { resultSets: NbaResultSet[] }
/** A gateway adapter, not an assumption that NBA.com supports browser CORS. */
export function createNbaClient(config: { gatewayUrl: string; getAccessToken?: () => string | undefined | Promise<string | undefined> }, fetcher: typeof fetch = fetch) {
  const root = baseUrl(config.gatewayUrl);
  return {
    async stats<T = NbaStatsResponse>(endpoint: string, query: Query = {}, signal?: AbortSignal): Promise<T> {
      const token = await config.getAccessToken?.();
      return request<T>(`${root}/${resource(endpoint)}`, { query, signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {} }, fetcher);
    },
  };
}
export function resultRows(result: NbaResultSet): Record<string, unknown>[] {
  return result.rowSet.map(row => Object.fromEntries(result.headers.map((key, index) => [key, row[index]])));
}
