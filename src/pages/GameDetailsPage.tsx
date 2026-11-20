import DataInformationCard from "../components/DataInformationCard";
import { loadInformationCards } from "../services/informationCards";
import type { SavedCard } from "../types/informationCards";
import { useEffect, useRef, useState } from "react";
import Brand from "../components/Brand";
import ChatPanel from "../components/ChatPanel";
import InformationCard from "../components/InformationCard";
import type { ScheduledGame } from "../services/games";

interface Props {
  game: ScheduledGame;
  onBack: () => void;
  onLogout: () => void;
  onSettings: () => void;
}
export default function GameDetailsPage({
  game,
  onBack,
  onLogout,
  onSettings,
}: Props) {
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [cardError, setCardError] = useState("");
  const [reloadCards, setReloadCards] = useState(0);
  const [chatOpen, setChatOpen] = useState(() => window.innerWidth > 700);
  const reopenButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const title = `${game.away.name} at ${game.home.name}`;
  const date = new Date(game.startsAt);
  const aliases: Record<string, string> = {
    GS: "GSW",
    NY: "NYK",
    NO: "NOP",
    SA: "SAS",
    WSH: "WAS",
    UTAH: "UTA",
  };
  const teamKey = (code: string) => aliases[code] || code;
  const gameKey = `${teamKey(game.away.abbreviation)}-${teamKey(game.home.abbreviation)}-${date.toISOString().slice(0, 10)}`;
  useEffect(() => {
    const controller = new AbortController();
    setCardError("");
    setSavedCards([]);
    loadInformationCards(gameKey, controller.signal)
      .then((cards) => {
        if (!controller.signal.aborted)
          setSavedCards((previous) => [
            ...new Map(
              [...cards, ...previous].map((card) => [card.id, card]),
            ).values(),
          ]);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCardError("Unable to load your saved cards.");
      });
    return () => controller.abort();
  }, [gameKey, reloadCards]);
  function cardSaved(card: SavedCard) {
    setSavedCards((previous) =>
      previous.some((item) => item.id === card.id)
        ? previous
        : [...previous, card],
    );
  }

  const timezone = Intl.DateTimeFormat()
    .resolvedOptions()
    .timeZone.replaceAll("_", " ");
  const tipoff = game.timeTbd
    ? "Time to be confirmed"
    : date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
  useEffect(() => {
    heading.current?.focus();
  }, []);
  function toggleChat(open: boolean) {
    setChatOpen(open);
    window.requestAnimationFrame(() =>
      (open ? closeButton : reopenButton).current?.focus(),
    );
  }
  const teams = [game.away, game.home];
  const images = teams.flatMap((team) =>
    team.logo
      ? [{ src: team.logo, alt: `${team.name} logo`, caption: team.name }]
      : [],
  );
  return (
    <div className={`game-details-layout ${chatOpen ? "with-chat" : ""}`}>
      <section className="game-details-content">
        <header className="details-header">
          <Brand />
          <button className="secondary" onClick={onSettings}>
            API settings
          </button>
          <button className="secondary" onClick={onLogout}>
            Sign out
          </button>
        </header>
        <main>
          <div className="details-navigation">
            <button className="text-button" onClick={onBack}>
              ← All games
            </button>
            {!chatOpen && (
              <button
                ref={reopenButton}
                className="secondary"
                onClick={() => toggleChat(true)}
              >
                Open chat
              </button>
            )}
          </div>
          <p className="eyebrow">NBA · UPCOMING MATCHUP</p>
          <h1 ref={heading} tabIndex={-1}>
            {title}
          </h1>
          <p className="muted">
            {date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {tipoff}
          </p>
          {cardError && (
            <p role="alert">
              {cardError}{" "}
              <button
                className="text-button"
                onClick={() => setReloadCards((value) => value + 1)}
              >
                Retry cards
              </button>
            </p>
          )}
          <div className="information-grid">
            {savedCards.map((card) => (
              <DataInformationCard key={card.id} card={card.card} />
            ))}
            <InformationCard title="Game information">
              <dl className="game-facts">
                <div>
                  <dt>Tip-off</dt>
                  <dd>{tipoff}</dd>
                </div>
                <div>
                  <dt>Timezone</dt>
                  <dd>{timezone}</dd>
                </div>
                <div>
                  <dt>Venue</dt>
                  <dd>{game.venue || "To be announced"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>Scheduled</dd>
                </div>
              </dl>
            </InformationCard>
            <InformationCard title="The matchup" images={images}>
              {!images.length && (
                <p className="team-initials">
                  {game.away.abbreviation} <span>vs</span>{" "}
                  {game.home.abbreviation}
                </p>
              )}
            </InformationCard>
            <InformationCard
              title="Teams"
              table={{
                columns: [
                  { key: "team", label: "Team" },
                  { key: "abbreviation", label: "Abbreviation" },
                  { key: "location", label: "Home / away" },
                ],
                rows: [
                  {
                    team: game.away.name,
                    abbreviation: game.away.abbreviation,
                    location: "Away",
                  },
                  {
                    team: game.home.name,
                    abbreviation: game.home.abbreviation,
                    location: "Home",
                  },
                ],
              }}
            />
            <InformationCard title="Statistics & trends">
              <p className="muted">
                Player statistics and historical results haven’t been loaded
                yet. Graphs will appear here when that data is connected.
              </p>
            </InformationCard>
          </div>
        </main>
      </section>
      <ChatPanel
        gameTitle={title}
        game={{
          gameId: game.id,
          gameKey,
          title,
          startsAt: game.startsAt,
          venue: game.venue,
        }}
        onCardSaved={cardSaved}
        hidden={!chatOpen}
        onClose={() => toggleChat(false)}
        closeButtonRef={closeButton}
      />
    </div>
  );
}
