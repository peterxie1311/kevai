import { validateCard, type CardProposal } from "../types/informationCards";
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
  gameId?: string;
  gameKey?: string;
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
      {
        game,
        input: conversation
          .slice(-5)
          .map((turn, index, turns) => ({
            ...turn,
            content: turn.content.slice(
              0,
              index === turns.length - 1 ? 4000 : 2000,
            ),
          })),
      },
      signal,
    );
    const cards: CardProposal[] =
      response.status === "incomplete"
        ? []
        : response.output
            .filter(
              (item) =>
                item.type === "function_call" &&
                item.name === "propose_information_card",
            )
            .slice(0, 3)
            .map((item) => ({
              id: crypto.randomUUID(),
              card: validateCard(JSON.parse(item.arguments || "{}")),
            }));
    const text =
      responseText(response) ||
      (cards.length
        ? "Here’s a card preview. Review it and click Yes to add it to this game."
        : "");
    if (!text.trim())
      throw new Error("The AI returned no answer. Please try again.");
    return {
      text,
      cards,
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
