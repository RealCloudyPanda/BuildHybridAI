import { useEffect, useId, useRef, useState } from "react";
import type { Flag } from "../domain/types";

const KIND_TEXT: Record<Flag["kind"], string> = {
  version: "This version",
  browser: "This browser",
  os: "This operating system",
  device: "This device",
  url: "This URL",
  number: "This number",
  quoted: "This quoted text",
};

interface Props { flag: Flag; children: string; onRemove: (f: Flag) => void; onKeep: (f: Flag) => void }

/** An amber-underlined span with a keyboard-accessible "Not in your notes" popover. */
export function FlagMark({ flag, children, onRemove, onKeep }: Props) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    pop.current?.querySelector("button")?.focus();
    const onDown = (e: MouseEvent) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };

  return (
    <span style={{ position: "relative" }}>
      <button
        ref={btn}
        type="button"
        className="flagged"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${children}: not in your notes`}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </button>
      {open && (
        <div
          ref={pop}
          id={id}
          role="dialog"
          aria-label="Not in your notes"
          className="flag-pop"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
        >
          <p>Not in your notes</p>
          <span>{KIND_TEXT[flag.kind]} “{flag.text}” isn't in your notes or answers. Remove it, or keep it if you know it's right.</span>
          <div className="row">
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { setOpen(false); onRemove(flag); }}>Remove</button>
            <button type="button" className="btn btn-sm" onClick={() => { setOpen(false); onKeep(flag); }}>Keep</button>
          </div>
        </div>
      )}
    </span>
  );
}

/** Splits text into plain parts and FlagMarks for each flagged substring. */
export function FlaggedText({ text, flags, onRemove, onKeep }: { text: string; flags: Flag[]; onRemove: (f: Flag) => void; onKeep: (f: Flag) => void }) {
  const spans: { start: number; end: number; flag: Flag }[] = [];
  const lower = text.toLowerCase();
  for (const f of flags) {
    const i = lower.indexOf(f.text.toLowerCase());
    if (i >= 0 && !spans.some((s) => i < s.end && i + f.text.length > s.start)) spans.push({ start: i, end: i + f.text.length, flag: f });
  }
  spans.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, k) => {
    if (s.start > pos) out.push(text.slice(pos, s.start));
    out.push(<FlagMark key={k} flag={s.flag} onRemove={onRemove} onKeep={onKeep}>{text.slice(s.start, s.end)}</FlagMark>);
    pos = s.end;
  });
  out.push(text.slice(pos));
  return <>{out}</>;
}
