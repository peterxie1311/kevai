import { useEffect, useState } from "react";
import Brand from "../components/Brand";
import GameCard from "../components/GameCard";
import GameDetailsPage from "./GameDetailsPage";
import SettingsPage from "./SettingsPage";
import {
  getUpcomingGames,
  type GameSchedule,
  type ScheduledGame,
} from "../services/games";
export default function DashboardPage({
  email,
  onLogout,
}: {
  email: string;
  onLogout: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<ScheduledGame | null>(null);
  const [schedule, setSchedule] = useState<GameSchedule>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getUpcomingGames(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSchedule(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "We couldn’t load the NBA schedule. Check your connection and try again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const groups = new Map<string, ScheduledGame[]>();
  for (const game of schedule?.games ?? []) {
    const label = new Date(game.startsAt).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(game);
  }
  if (settingsOpen)
    return <SettingsPage onBack={() => setSettingsOpen(false)} />;

  if (selectedGame)
    return (
      <GameDetailsPage
        game={selectedGame}
        onBack={() => setSelectedGame(null)}
        onLogout={onLogout}
        onSettings={() => setSettingsOpen(true)}
      />
    );

  return (
    <section className="dashboard games-dashboard">
      <header>
        <Brand />
        <div className="dashboard-account">
          <span>{email}</span>
          <button className="secondary" onClick={() => setSettingsOpen(true)}>
            API settings
          </button>
          <button className="secondary" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main>
        <div className="schedule-heading">
          <div>
            <p className="eyebrow">YOUR COURTSIDE COMPANION</p>
            <h1>Coming up.</h1>
            <p className="muted">
              NBA matchups for the next 7 days. All times in{" "}
              {Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone.replaceAll("_", " ")}
              .
            </p>
          </div>
          <button
            className="secondary"
            disabled={loading}
            onClick={() => setAttempt((value) => value + 1)}
          >
            {loading ? "Loading…" : "Refresh games"}
          </button>
        </div>
        {loading && (
          <div className="schedule-state" role="status">
            Loading upcoming NBA games…
          </div>
        )}
        {!loading && error && (
          <div className="schedule-state" role="alert">
            <p>{error}</p>
            <button
              className="secondary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && schedule?.games.length === 0 && (
          <div className="schedule-state" role="status">
            No scheduled NBA games in the next 7 days. Check back soon.
          </div>
        )}
        {!loading &&
          !error &&
          [...groups].map(([day, data]) => (
            <section className="game-day" key={day}>
              <h2>
                {day}
                <span>{data.length} games</span>
              </h2>
              <div className="games-grid">
                {data.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={setSelectedGame}
                  />
                ))}
              </div>
            </section>
          ))}
        {!loading && !error && schedule && (
          <p className="schedule-source">
            Schedule: {schedule.source} · Updated{" "}
            {new Date(schedule.fetchedAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            · Schedules may change.
          </p>
        )}
      </main>
    </section>
  );
}
