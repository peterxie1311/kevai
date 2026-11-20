import { useRef, useState } from "react";
import DataInformationCard from "./DataInformationCard";
import { saveInformationCard } from "../services/informationCards";
import type { GameContext } from "../services/gameChat";
import type { CardProposal, SavedCard } from "../types/informationCards";
export default function CardPreview({
  proposal,
  game,
  onSaved,
}: {
  proposal: CardProposal;
  game: GameContext;
  onSaved: (card: SavedCard) => void;
}) {
  const [state, setState] = useState<
    "pending" | "saving" | "saved" | "dismissed"
  >("pending");
  const [error, setError] = useState("");
  const saving = useRef(false);
  async function confirm() {
    if (saving.current || state !== "pending") return;
    saving.current = true;
    setState("saving");
    setError("");
    try {
      const saved = await saveInformationCard(proposal, game);
      setState("saved");
      onSaved(saved);
    } catch (error) {
      setState("pending");
      setError(error instanceof Error ? error.message : "Unable to save card.");
    } finally {
      saving.current = false;
    }
  }
  if (state === "dismissed")
    return <p className="muted">Card dismissed. Nothing was saved.</p>;
  return (
    <div className="card-preview">
      <p className="eyebrow">INFORMATION CARD PREVIEW</p>
      <DataInformationCard card={proposal.card} />
      {state === "saved" ? (
        <p role="status">✓ Added to this game.</p>
      ) : (
        <>
          <p>Add this card to your game screen?</p>
          <div className="preview-actions">
            <button
              className="primary"
              disabled={state === "saving"}
              onClick={() => void confirm()}
            >
              {state === "saving" ? "Saving…" : "Yes, add card"}
            </button>
            <button
              className="secondary"
              disabled={state === "saving"}
              onClick={() => setState("dismissed")}
            >
              No
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="chat-error">
          {error}
        </p>
      )}
    </div>
  );
}
