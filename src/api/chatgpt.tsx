import { baseUrl, request } from "./http";
export interface ChatRequest {
  model?: string;
  game?: { title: string; startsAt: string; venue: string };
  input:
    | string
    | Array<{ role: "user" | "assistant" | "system"; content: string }>;
  instructions?: string;
  max_output_tokens?: number;
}
export interface UrlCitation {
  type: "url_citation";
  start_index: number;
  end_index: number;
  url: string;
  title: string;
}
export interface ResponsePart {
  type: string;
  text?: string;
  annotations?: UrlCitation[];
}
export interface ChatResponse {
  id: string;
  status?: string;
  output: Array<{
    type: string;
    content?: ResponsePart[];
  }>;
}
/** Gateway must authenticate callers and forward an allowlisted request to POST /v1/responses. */
export function createChatGPTClient(
  config: {
    endpoint: string;
    getAccessToken?: () => string | undefined | Promise<string | undefined>;
  },
  fetcher: typeof fetch = fetch,
) {
  const endpoint = baseUrl(config.endpoint);
  return {
    async respond(
      body: ChatRequest,
      signal?: AbortSignal,
    ): Promise<ChatResponse> {
      if (
        (body.model !== undefined && !body.model.trim()) ||
        (typeof body.input === "string"
          ? !body.input.trim()
          : !body.input.length)
      )
        throw new Error("Model and input are required");
      const token = await config.getAccessToken?.();
      return request<ChatResponse>(
        endpoint,
        {
          method: "POST",
          body: { ...body, stream: false, store: false },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal,
          timeoutMs: 75_000,
        },
        fetcher,
      );
    },
  };
}
export function responseText(response: ChatResponse): string {
  return response.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("");
}

export function responseParts(response: ChatResponse): ResponsePart[] {
  return response.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter(
      (part) => part.type === "output_text" && typeof part.text === "string",
    );
}
