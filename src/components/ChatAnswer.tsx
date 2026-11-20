import type { ReactNode } from "react";
import type { ResponsePart } from "../api/chatgpt";
export default function ChatAnswer({ parts }: { parts: ResponsePart[] }) {
  return (
    <>
      {parts.map((part, partIndex) => {
        const text = part.text ?? "";
        const nodes: ReactNode[] = [];
        let cursor = 0;
        for (const citation of [...(part.annotations ?? [])].sort(
          (a, b) => a.start_index - b.start_index,
        )) {
          if (
            citation.type !== "url_citation" ||
            !/^https?:\/\//i.test(citation.url) ||
            !Number.isInteger(citation.start_index) ||
            !Number.isInteger(citation.end_index) ||
            citation.start_index < cursor ||
            citation.end_index < citation.start_index ||
            citation.end_index > text.length
          )
            continue;
          nodes.push(text.slice(cursor, citation.start_index));
          nodes.push(
            <a
              className="chat-citation"
              key={`${partIndex}-${citation.start_index}`}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              title={citation.title}
            >
              {citation.title || "Source"}
            </a>,
          );
          cursor = citation.end_index;
        }
        nodes.push(text.slice(cursor));
        return <div key={partIndex}>{nodes}</div>;
      })}
    </>
  );
}
