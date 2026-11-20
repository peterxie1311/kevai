import {
  createChatGPTClient,
  responseParts,
  responseText,
} from "../api/chatgpt";
import { ApiError } from "../api/http";
import { supabaseConfig } from "../config";
import { auth } from "./auth";
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
export interface GameContext {
  title: string;
  startsAt: string;
  venue: string;
}
const client = createChatGPTClient({
  endpoint: `${supabaseConfig.url}/functions/v1/game-chat`,
  getAccessToken: auth.getAccessToken,
});
export async function askAboutGame(
  game: GameContext,
  conversation: ChatTurn[],
  signal?: AbortSignal,
) {
  try {
    const response = await client.respond(
      { game, input: conversation.slice(-5).map((turn, index, turns) => ({ ...turn, content: turn.content.slice(0, index === turns.length - 1 ? 4000 : 2000) })) },
      signal,
    );
    const text = responseText(response);
    if (!text.trim())
      throw new Error("The AI returned no answer. Please try again.");
    return {
      text,
      parts: responseParts(response),
      incomplete: response.status === "incomplete",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      const data = error.data as { error?: unknown } | undefined;
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "Unable to connect to chat. Please try again.",
      );
    }
    throw error;
  }
}
