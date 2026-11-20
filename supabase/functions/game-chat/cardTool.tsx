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
    "When the user asks to put information into a card, propose a card for preview and explicit approval. This does not save anything. Use only facts already obtained in this conversation or verified through search, retaining source URLs. Never invent statistics or graph points. If numeric data is unavailable, propose text instead. Do not call this tool unless a card was requested. The application handles saving only after the user clicks Yes.",
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
          columns: { type: "array", items: text },
          rows: { type: "array", items: { type: "array", items: text } },
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
