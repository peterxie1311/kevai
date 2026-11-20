export interface CardData {
  title: string;
  body: string;
  sources: { title: string; url: string }[];
  images: { src: string; alt: string; caption: string }[];
  table: { columns: string[]; rows: string[][] } | null;
  graph: { label: string; points: { label: string; value: number }[] } | null;
}
export interface CardProposal {
  id: string;
  card: CardData;
}
export interface SavedCard {
  id: string;
  game_key: string;
  card: CardData;
  created_at: string;
}
function string(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}
function url(value: unknown): value is string {
  if (!string(value, 2000)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
/** Only JSON data is accepted: never JSX, HTML, executable code or database commands. */
export function validateCard(value: unknown): CardData {
  if (
    !value ||
    typeof value !== "object" ||
    JSON.stringify(value).length > 25000
  )
    throw new Error("Invalid information card.");
  const c = value as CardData;
  if (!string(c.title, 150) || !c.title.trim() || !string(c.body, 8000))
    throw new Error("Invalid card title or text.");
  if (
    !Array.isArray(c.sources) ||
    c.sources.length > 10 ||
    c.sources.some((s) => !s || !url(s.url) || !string(s.title, 200))
  )
    throw new Error("Invalid card sources.");
  if (
    !Array.isArray(c.images) ||
    c.images.length > 4 ||
    c.images.some(
      (i) =>
        !i || !url(i.src) || !string(i.alt, 200) || !string(i.caption, 300),
    )
  )
    throw new Error("Invalid card images.");
  if (
    c.table !== null &&
    (!c.table ||
      !Array.isArray(c.table.columns) ||
      !c.table.columns.length ||
      c.table.columns.length > 10 ||
      c.table.columns.some((x) => !string(x, 100)) ||
      !Array.isArray(c.table.rows) ||
      c.table.rows.length > 80 ||
      c.table.rows.some(
        (row) =>
          !Array.isArray(row) ||
          row.length !== c.table!.columns.length ||
          row.some((cell) => !string(cell, 500)),
      ))
  )
    throw new Error("Invalid card table.");
  if (
    c.graph !== null &&
    (!c.graph ||
      !string(c.graph.label, 200) ||
      !Array.isArray(c.graph.points) ||
      !c.graph.points.length ||
      c.graph.points.length > 100 ||
      c.graph.points.some(
        (p) =>
          !p ||
          !string(p.label, 100) ||
          typeof p.value !== "number" ||
          !Number.isFinite(p.value),
      ))
  )
    throw new Error("Invalid card graph.");
  if (!c.body.trim() && !c.images.length && !c.table && !c.graph)
    throw new Error("The card has no content.");
  return {
    title: c.title,
    body: c.body,
    sources: c.sources,
    images: c.images,
    table: c.table,
    graph: c.graph,
  };
}
