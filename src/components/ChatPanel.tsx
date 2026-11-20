import CardPreview from "./CardPreview";
import type { CardProposal, SavedCard } from "../types/informationCards";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

import ChatAnswer from "./ChatAnswer";
import {
  askAboutGame,
  type GameContext,
  type ChatTurn,
} from "../services/gameChat";
import type { ResponsePart } from "../api/chatgpt";

interface Props {
  gameTitle: string;
  game: GameContext;
  onCardSaved: (card: SavedCard) => void;
  hidden: boolean;
  onClose: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
}
export default function ChatPanel({
  gameTitle,
  game,
  onCardSaved,
  hidden,
  onClose,
  closeButtonRef,
}: Props) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<
    (ChatTurn & {
      parts?: ResponsePart[];
      incomplete?: boolean;
      cards?: CardProposal[];
    })[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, busy]);
  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const conversation: ChatTurn[] = [
      ...messages.map(({ role, content }) => ({ role, content })),
      { role: "user", content },
    ];
    setMessages((previous) => [...previous, { role: "user", content }]);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const answer = await askAboutGame(game, conversation, controller.signal);
      if (!controller.signal.aborted)
        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: answer.text,
            parts: answer.parts,
            incomplete: answer.incomplete,
            cards: answer.cards,
          },
        ]);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error ? caught.message : "Unable to send message.",
        );
        setDraft(content);
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  function stop() {
    active.current?.abort();
    active.current = null;
    setBusy(false);
    setError("Request stopped. You can send another message.");
  }
  return (
    <aside className="game-chat" hidden={hidden} aria-label="Game chat">
      <div className="chat-heading">
        <div>
          <p className="eyebrow">YOUR GAME COMPANION</p>
          <h2>Game chat</h2>
        </div>
        <button
          ref={closeButtonRef}
          className="chat-close"
          aria-label="Close chat"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="chat-context">{gameTitle}</p>
      <div ref={log} className="chat-messages" role="log" aria-live="polite">
        <div className="chat-intro">
          <span aria-hidden="true">✦</span>
          <h3>A place for your game questions.</h3>
          <p>
            Ask about injuries, lineups, or the latest team news. Web search is
            available for current information, with clickable sources.
          </p>
        </div>
        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={index}>
            <span>{message.role === "user" ? "You" : "KevAI"}</span>
            {message.parts?.length ? (
              <ChatAnswer parts={message.parts} />
            ) : (
              message.content
            )}
            {message.cards?.map((proposal) => (
              <CardPreview
                key={proposal.id}
                proposal={proposal}
                game={game}
                onSaved={onCardSaved}
              />
            ))}
            {message.incomplete && <small>Response may be incomplete.</small>}
          </div>
        ))}
        {busy && (
          <p role="status" className="chat-progress">
            Researching your question…
          </p>
        )}
      </div>
      <form className="chat-composer" onSubmit={send}>
        <label htmlFor="game-message">Your message</label>
        <textarea
          id="game-message"
          rows={3}
          maxLength={4000}
          placeholder="Ask about this matchup…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="primary"
          disabled={busy || !draft.trim()}
          type="submit"
        >
          {busy ? "Researching…" : "Send message"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
        {busy && (
          <button type="button" className="text-button" onClick={stop}>
            Stop response
          </button>
        )}
        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}
        <p>
          Messages are sent to OpenAI. Sources may change; verify important
          updates.
        </p>
      </form>
    </aside>
  );
}
