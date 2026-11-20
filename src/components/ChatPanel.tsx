import { useState, type FormEvent, type RefObject } from "react";

interface Props {
  gameTitle: string;
  hidden: boolean;
  onClose: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
}
export default function ChatPanel({
  gameTitle,
  hidden,
  onClose,
  closeButtonRef,
}: Props) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setMessages((previous) => [...previous, draft.trim()]);
    setDraft("");
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
      <div className="chat-messages" role="log" aria-live="polite">
        <div className="chat-intro">
          <span aria-hidden="true">✦</span>
          <h3>A place for your game questions.</h3>
          <p>
            AI replies aren’t connected yet. You can draft messages here; they
            stay in this view until you leave the game.
          </p>
        </div>
        {messages.map((message, index) => (
          <p className="chat-message" key={index}>
            <span>You</span>
            {message}
          </p>
        ))}
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
        <button className="primary" disabled={!draft.trim()} type="submit">
          Add message <span aria-hidden="true">↗</span>
        </button>
        <p>Draft only · No messages are sent to AI.</p>
      </form>
    </aside>
  );
}
