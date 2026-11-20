import { db } from "./database";
import { ApiError } from "../api/http";
import {
  validateCard,
  type CardProposal,
  type SavedCard,
} from "../types/informationCards";
import type { GameContext } from "./gameChat";
export async function loadInformationCards(
  gameKey: string,
  signal?: AbortSignal,
): Promise<SavedCard[]> {
  const rows = await db.select<SavedCard>(
    "user_information_cards",
    {
      select: "id,game_key,card,created_at",
      game_key: `eq.${gameKey}`,
      order: "created_at.asc",
    },
    signal,
  );
  return rows.map((row) => ({ ...row, card: validateCard(row.card) }));
}
/** Only invoked from the explicit preview confirmation button. UUID makes retries idempotent. */
export async function saveInformationCard(
  proposal: CardProposal,
  game: GameContext,
): Promise<SavedCard> {
  if (!game.gameId || !game.gameKey)
    throw new Error("Select a game before saving a card.");
  const card = validateCard(proposal.card);
  try {
    const rows = await db.insert<SavedCard>("user_information_cards", {
      id: proposal.id,
      game_key: game.gameKey,
      game_id: game.gameId,
      game_title: game.title,
      card,
    });
    if (!rows[0]) throw new Error("Card was not saved. Please try again.");
    return rows[0];
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const existing = await db.select<SavedCard>("user_information_cards", {
        id: `eq.${proposal.id}`,
        game_key: `eq.${game.gameKey}`,
      });
      if (existing[0])
        return { ...existing[0], card: validateCard(existing[0].card) };
    }
    throw new Error(
      "Unable to save this card. Check your connection and try again.",
    );
  }
}
