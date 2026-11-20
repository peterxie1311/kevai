import { useState } from "react";
import type { GameTeam, ScheduledGame } from "../services/games";
function Team({ team, location }: { team: GameTeam; location: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="game-team">
      <div className="team-emblem">
        {team.logo && !failed ? (
          <img
            src={team.logo}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <span>{team.abbreviation || "NBA"}</span>
        )}
      </div>
      <strong>{team.name}</strong>
      <span className="team-location">{location}</span>
    </div>
  );
}
export default function GameCard({ game }: { game: ScheduledGame }) {
  const date = new Date(game.startsAt);
  return (
    <article
      className="game-card"
      aria-label={`${game.away.name} at ${game.home.name}`}
    >
      <div className="game-card-top">
        <span>NBA · UPCOMING</span>
        <time dateTime={game.startsAt}>
          {date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>
      <div className="matchup">
        <Team team={game.away} location="AWAY" />
        <span className="versus">vs</span>
        <Team team={game.home} location="HOME" />
      </div>
      <div className="game-card-bottom">
        <strong>
          {game.timeTbd
            ? "Time TBD"
            : date.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
        </strong>
        <span>{game.venue || "Venue to be announced"}</span>
      </div>
    </article>
  );
}
