import { useCallback, useEffect, useRef, useState } from "react";
import type { Draft } from "../domain/types";
import { deleteDraft, listDrafts, newDraft, saveDraft } from "./drafts";

export const AUTOSAVE_MS = 400;

/** Holds all drafts and the active one; persists edits to IndexedDB after a 400 ms debounce. */
export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef(new Map<string, Draft>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const items = [...pending.current.values()];
    pending.current.clear();
    timer.current = null;
    await Promise.all(items.map(saveDraft));
  }, []);

  useEffect(() => {
    let alive = true;
    listDrafts().then((ds) => {
      if (!alive) return;
      if (ds.length === 0) {
        const d = newDraft();
        ds = [d];
      }
      setDrafts(ds);
      setActiveId(ds[0].id);
      setLoaded(true);
    });
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      alive = false;
      window.removeEventListener("pagehide", onHide);
    };
  }, [flush]);

  const schedule = useCallback(
    (d: Draft) => {
      pending.current.set(d.id, d);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  const update = useCallback(
    (id: string, patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => {
      setDrafts((ds) => {
        const next = ds.map((d) => {
          if (d.id !== id) return d;
          const p = typeof patch === "function" ? patch(d) : patch;
          const nd = { ...d, ...p, updatedAt: Date.now() };
          schedule(nd);
          return nd;
        });
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
      });
    },
    [schedule],
  );

  const create = useCallback(
    (d: Draft = newDraft()) => {
      setDrafts((ds) => [d, ...ds]);
      setActiveId(d.id);
      schedule(d);
      return d;
    },
    [schedule],
  );

  const remove = useCallback(async (id: string) => {
    pending.current.delete(id);
    await deleteDraft(id);
    setDrafts((ds) => {
      const rest = ds.filter((d) => d.id !== id);
      if (rest.length === 0) {
        const d = newDraft();
        void saveDraft(d);
        rest.push(d);
      }
      setActiveId((cur) => (cur === id ? rest[0].id : cur));
      return rest;
    });
  }, []);

  const active = drafts.find((d) => d.id === activeId) ?? null;
  return { drafts, active, activeId, setActiveId, update, create, remove, loaded, flush };
}
