const text = { type: "string" };
function object(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}
export const informationCardTool = {
  type: "function",
  name: "propose_information_card",
  description:
    "When the user asks to put information into a card, propose a card for preview and explicit approval. This does not save anything. Use only facts already obtained in this conversation or verified through search, retaining source URLs. Never invent statistics or graph points. Use tables for requested comparisons, rankings, rosters and game logs. Keep one player, team or game per row and one requested attribute or statistic per column. Preserve the requested detail rather than collapsing multiple statistics into a generic Value or Notes cell. Two columns are appropriate only when the information actually has two fields. Include the season or date range and units in the title, body or headers. Use Not available for unverified cells, never zero or an invented value. If no useful tabular data is available, explain what is missing instead of fabricating a table. Do not call this tool unless a card was requested. The application handles saving only after the user clicks Yes.",
  strict: true,
  parameters: object({
    title: text,
    body: text,
    sources: { type: "array", items: object({ title: text, url: text }) },
    images: {
      type: "array",
      items: object({ src: text, alt: text, caption: text }),
    },
    table: {
      anyOf: [
        { type: "null" },
        object({
          columns: {
            type: "array",
            description: "Ordered headers, 1 to 10. Match the user request. For a player comparison, use Player, Team, PPG, RPG, APG when those statistics are requested and available; for game logs use Date, Opponent, MIN, PTS, REB, AST. These are layout examples, not a requirement to add unrequested statistics.",
            items: text,
          },
          rows: {
            type: "array",
            description: "Up to 80 rows. Every row must contain exactly one cell per column in the same order. Separate each statistic into its matching column. Preserve requested rows; explain any unavailable data or truncation in body. Format verified numbers as strings and use Not available for missing values.",
            items: { type: "array", items: text },
          },
        }),
      ],
    },
    graph: {
      anyOf: [
        { type: "null" },
        object({
          label: text,
          points: {
            type: "array",
            items: object({ label: text, value: { type: "number" } }),
          },
        }),
      ],
    },
  }),
};
