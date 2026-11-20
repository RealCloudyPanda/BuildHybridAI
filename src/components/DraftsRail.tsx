import { useEffect, useRef, useState } from "react";
import type { Draft } from "../domain/types";
import { IconPlus, IconTrash } from "./icons";

interface Props {
  drafts: Draft[];
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function relativeTime(t: number, now = Date.now()) {
  const s = Math.round((t - now) / 1000);
  if (Math.abs(s) < 45) return "just now";
  const m = Math.round(s / 60);
  if (Math.abs(m) < 60) return rtf.format(m, "minute");
  const h = Math.round(m / 60);
  if (Math.abs(h) < 24) return rtf.format(h, "hour");
  return rtf.format(Math.round(h / 24), "day");
}

export function draftName(d: Draft) {
  return d.report?.title || d.notes.split("\n")[0].trim().slice(0, 60) || "Untitled draft";
}

export function DraftsRail({ drafts, activeId, open, onClose, onSelect, onNew, onDelete }: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    el?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const items = [...el.querySelectorAll<HTMLElement>("button:not(:disabled)")];
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={"scrim" + (open ? " open" : "")} onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className={"rail" + (open ? " open" : "")} aria-label="Drafts">
        <div className="rail-head">
          <h2 className="pane-title" style={{ margin: 0 }}>Drafts</h2>
          <button type="button" className="btn btn-sm" onClick={onNew}><IconPlus /> New draft</button>
        </div>
        {drafts.length === 0 && <p className="rail-empty">No drafts yet</p>}
        <ul className="rail-list">
          {drafts.map((d) => (
            <li key={d.id} className="rail-item" aria-current={d.id === activeId ? "true" : undefined}>
              {confirming === d.id ? (
                <div className="rail-confirm" role="group" aria-label="Confirm delete">
                  <span>Delete draft? This can't be undone.</span>
                  <div className="row">
                    <button type="button" className="btn btn-sm btn-danger" autoFocus onClick={() => { setConfirming(null); onDelete(d.id); }}>Delete</button>
                    <button type="button" className="btn btn-sm" onClick={() => setConfirming(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <button type="button" className="rail-open" onClick={() => onSelect(d.id)}>
                    <span className={"rail-dot " + (d.lastRun?.source ?? "")} aria-hidden="true" />
                    <span className="rail-name">{draftName(d)}</span>
                    <span className="rail-time">{relativeTime(d.updatedAt)}</span>
                  </button>
                  <button type="button" className="icon-btn sm rail-del" aria-label={`Delete draft: ${draftName(d)}`} onClick={() => setConfirming(d.id)}>
                    <IconTrash />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
