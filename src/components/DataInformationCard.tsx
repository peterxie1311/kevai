import InformationCard from "./InformationCard";
import type { CardData } from "../types/informationCards";
export default function DataInformationCard({ card }: { card: CardData }) {
  const table = card.table
    ? {
        columns: card.table.columns.map((label, index) => ({
          key: String(index),
          label,
        })),
        rows: card.table.rows.map((row) =>
          Object.fromEntries(row.map((cell, index) => [String(index), cell])),
        ),
      }
    : undefined;
  return (
    <InformationCard
      title={card.title}
      table={table}
      images={card.images}
      graph={card.graph ?? undefined}
    >
      {card.body && <p className="card-body">{card.body}</p>}
      {card.sources.length > 0 && (
        <div className="card-sources">
          <span>Sources</span>
          {card.sources.map((source, index) => (
            <a
              key={index}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.title || "Source"}
            </a>
          ))}
        </div>
      )}
    </InformationCard>
  );
}
