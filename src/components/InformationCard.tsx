import { useId, type ReactNode } from "react";

interface Column {
  key: string;
  label: string;
}
interface Props {
  title: string;
  children?: ReactNode;
  table?: { columns: Column[]; rows: Record<string, ReactNode>[] };
  images?: { src: string; alt: string; caption?: string }[];
  graph?: { label: string; points: { label: string; value: number }[] };
}

/** Content cards can hold text, images, scrollable tables, or a simple graph. */
export default function InformationCard({
  title,
  children,
  table,
  images,
  graph,
}: Props) {
  const headingId = useId();
  const points =
    graph?.points.filter((point) => Number.isFinite(point.value)) ?? [];
  const min = Math.min(0, ...points.map((point) => point.value));
  const max = Math.max(1, ...points.map((point) => point.value));
  const coordinates = points
    .map(
      (point, index) =>
        `${20 + (index * 360) / Math.max(1, points.length - 1)},${140 - ((point.value - min) * 120) / (max - min)}`,
    )
    .join(" ");

  return (
    <section className="information-card" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {children}
      {images && (
        <div className="information-images">
          {images.map((image) => (
            <figure key={image.src}>
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
              {image.caption && <figcaption>{image.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {graph &&
        (points.length ? (
          <figure className="information-graph">
            <svg viewBox="0 0 400 165" role="img" aria-label={graph.label}>
              <title>{graph.label}</title>
              <path d="M20 20V145H380" fill="none" stroke="#d8dfd1" />
              <polyline
                points={coordinates}
                fill="none"
                stroke="#416f47"
                strokeWidth="3"
              />
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={20 + (index * 360) / Math.max(1, points.length - 1)}
                  cy={140 - ((point.value - min) * 120) / (max - min)}
                  r="4"
                  fill="#416f47"
                >
                  <title>
                    {point.label}: {point.value}
                  </title>
                </circle>
              ))}
            </svg>
            <figcaption>{graph.label}</figcaption>
            <details>
              <summary>View graph data</summary>
              <ul>
                {points.map((point, index) => (
                  <li key={index}>
                    {point.label}: {point.value}
                  </li>
                ))}
              </ul>
            </details>
          </figure>
        ) : (
          <p className="muted">No graph data available.</p>
        ))}
      {table && (
        <div
          className="information-table"
          role="region"
          aria-label={`${title} table`}
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th scope="col" key={column.key}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={index}>
                  {table.columns.map((column) => (
                    <td key={column.key}>{row[column.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
