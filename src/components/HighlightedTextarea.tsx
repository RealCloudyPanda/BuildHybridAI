import { useRef, type KeyboardEvent } from "react";
import type { SensitiveMatch } from "../domain/sensitivity";

interface Props {
  id: string;
  value: string;
  matches: SensitiveMatch[];
  over: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  counter: string;
  describedBy?: string;
}

/** A mono textarea with a mirror layer behind it that underlines sensitive spans. */
export function HighlightedTextarea({ id, value, matches, over, onChange, onSubmit, counter, describedBy }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const parts: (string | { t: string; k: string })[] = [];
  let i = 0;
  for (const m of matches) {
    if (m.start > i) parts.push(value.slice(i, m.start));
    parts.push({ t: value.slice(m.start, m.end), k: m.kind });
    i = m.end;
  }
  parts.push(value.slice(i) + "\n");

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={"notes-wrap" + (over ? " over" : "")}>
      <div className="hl-layer" ref={layer} aria-hidden="true">
        {parts.map((p, idx) => (typeof p === "string" ? p : <mark key={idx} data-kind={p.k}>{p.t}</mark>))}
      </div>
      <textarea
        id={id}
        className="notes-input"
        value={value}
        spellCheck={false}
        placeholder={"What happened? Rough is fine.\ne.g. picked Tents, opened a tent, hit back, filter gone. chrome on mac"}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        onScroll={(e) => {
          if (layer.current) layer.current.scrollTop = e.currentTarget.scrollTop;
        }}
      />
      <span className={"counter" + (over ? " over" : "")} aria-live="polite">{counter}</span>
    </div>
  );
}
