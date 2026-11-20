import { request } from "../api/http";
export interface GameTeam {
  name: string;
  abbreviation: string;
  logo?: string;
}
export interface ScheduledGame {
  id: string;
  startsAt: string;
  home: GameTeam;
  away: GameTeam;
  venue: string;
  timeTbd: boolean;
}
export interface GameSchedule {
  games: ScheduledGame[];
  source: "NBA.com" | "ESPN";
  fetchedAt: string;
}
const NBA_SCHEDULE =
  "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json";
const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const DAY = 86_400_000;
type ObjectData = Record<string, unknown>;
function object(value: unknown): ObjectData {
  return value && typeof value === "object" ? (value as ObjectData) : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function logo(value: unknown): string | undefined {
  const url = text(value);
  return /^https:\/\/(?:a\.espncdn\.com|cdn\.nba\.com)\//.test(url)
    ? url
    : undefined;
}
function upcoming(games: ScheduledGame[], now: Date): ScheduledGame[] {
  return [
    ...new Map(
      games
        .filter(
          (g) =>
            Number.isFinite(Date.parse(g.startsAt)) &&
            Date.parse(g.startsAt) >= now.getTime() &&
            Date.parse(g.startsAt) < now.getTime() + 7 * DAY,
        )
        .map((g) => [g.id, g]),
    ).values(),
  ].sort(
    (a, b) =>
      Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
      a.id.localeCompare(b.id),
  );
}
export function parseNbaSchedule(
  payload: unknown,
  now = new Date(),
): ScheduledGame[] {
  const schedule = object(object(payload).leagueSchedule);
  if (!Array.isArray(schedule.gameDates))
    throw new Error("Invalid NBA schedule response");
  const games: ScheduledGame[] = [];
  for (const day of schedule.gameDates)
    for (const item of array(object(day).games)) {
      const g = object(item),
        home = object(g.homeTeam),
        away = object(g.awayTeam);
      if (g.gameStatus !== 1 || /postpon|cancel/i.test(text(g.gameStatusText)))
        continue;
      const team = (t: ObjectData): GameTeam => ({
        name: [text(t.teamCity), text(t.teamName)].filter(Boolean).join(" "),
        abbreviation: text(t.teamTricode),
      });
      if (!text(g.gameId) || !text(home.teamName) || !text(away.teamName))
        continue;
      games.push({
        id: text(g.gameId),
        startsAt: text(g.gameDateTimeUTC),
        home: team(home),
        away: team(away),
        venue: text(g.arenaName),
        timeTbd: /tbd/i.test(text(g.gameStatusText)),
      });
    }
  return upcoming(games, now);
}
export function parseEspnSchedule(
  payload: unknown,
  now = new Date(),
): ScheduledGame[] {
  if (!Array.isArray(object(payload).events))
    throw new Error("Invalid ESPN schedule response");
  const games: ScheduledGame[] = [];
  for (const event of object(payload).events as unknown[]) {
    const e = object(event),
      competition = object(array(e.competitions)[0]);
    const status = object(object(competition.status ?? e.status).type);
    if (
      status.state !== "pre" ||
      /postpon|cancel|suspend/i.test(text(status.name))
    )
      continue;
    const competitors = array(competition.competitors).map(object);
    const home = object(competitors.find((c) => c.homeAway === "home")?.team),
      away = object(competitors.find((c) => c.homeAway === "away")?.team);
    const team = (t: ObjectData): GameTeam => ({
      name: text(t.displayName),
      abbreviation: text(t.abbreviation),
      logo: logo(t.logo),
    });
    if (!text(e.id) || !text(home.displayName) || !text(away.displayName))
      continue;
    games.push({
      id: text(e.id),
      startsAt: text(e.date),
      home: team(home),
      away: team(away),
      venue: text(object(competition.venue).fullName),
      timeTbd:
        competition.timeValid === false || /tbd/i.test(text(status.detail)),
    });
  }
  return upcoming(games, now);
}
let cache: GameSchedule | undefined;
/** Real schedules only. NBA feed first; public ESPN NBA scoreboards are the fallback. */
export async function getUpcomingGames(
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<GameSchedule> {
  if (
    fetcher === fetch &&
    cache &&
    now.getTime() - Date.parse(cache.fetchedAt) >= 0 &&
    now.getTime() - Date.parse(cache.fetchedAt) < 5 * 60_000
  )
    return { ...cache, games: upcoming(cache.games, now) };
  let games: ScheduledGame[], source: GameSchedule["source"];
  try {
    games = parseNbaSchedule(
      await request<unknown>(
        NBA_SCHEDULE,
        { signal, timeoutMs: 5_000 },
        fetcher,
      ),
      now,
    );
    if (!games.length) throw new Error("No current NBA schedule");
    source = "NBA.com";
  } catch {
    if (signal?.aborted) throw signal.reason;
    // ESPN's range query is unreliable; request individual NBA calendar days.
    const days = Array.from({ length: 9 }, (_, i) =>
      new Date(now.getTime() + (i - 1) * DAY)
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", ""),
    );
    const results = await Promise.all(
      days.map((date) =>
        request<unknown>(
          ESPN_SCOREBOARD,
          { query: { dates: date, limit: 100 }, signal, timeoutMs: 15_000 },
          fetcher,
        ),
      ),
    );
    games = upcoming(
      results.flatMap((payload) => parseEspnSchedule(payload, now)),
      now,
    );
    source = "ESPN";
  }
  const schedule = { games, source, fetchedAt: now.toISOString() };
  if (fetcher === fetch) cache = schedule;
  return schedule;
}
