import { useCallback, useEffect, useRef, useState } from "react";
import type { Draft } from "../domain/types";
import { deleteDraft, listDrafts, newDraft, saveDraft } from "./drafts";

export const AUTOSAVE_MS = 400;

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const currentDrafts = useRef<Draft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef(new Map<string, Draft>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publish = useCallback((next: Draft[]) => {
    currentDrafts.current = next;
    setDrafts(next);
  }, []);

  const flush = useCallback(async () => {
    const items = [...pending.current.values()];
    pending.current.clear();
    if (timer.current !== null) clearTimeout(timer.current);
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
      publish(ds);
      setActiveId(ds[0].id);
      setLoaded(true);
    });
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      alive = false;
      window.removeEventListener("pagehide", onHide);
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [flush, publish]);

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
      const d = currentDrafts.current.find((draft) => draft.id === id);
      if (!d) return;
      const p = typeof patch === "function" ? patch(d) : patch;
      const next = { ...d, ...p, updatedAt: Date.now() };
      publish(currentDrafts.current.map((draft) => draft.id === id ? next : draft)
        .sort((a, b) => b.updatedAt - a.updatedAt));
      schedule(next);
    },
    [publish, schedule],
  );

  const create = useCallback(
    (d: Draft = newDraft()) => {
      publish([d, ...currentDrafts.current]);
      setActiveId(d.id);
      schedule(d);
      return d;
    },
    [publish, schedule],
  );

  const remove = useCallback(async (id: string) => {
    const rest = currentDrafts.current.filter((d) => d.id !== id);
    if (rest.length === currentDrafts.current.length) return;
    if (rest.length === 0) {
      const replacement = newDraft();
      rest.push(replacement);
      schedule(replacement);
    }

    publish(rest);
    setActiveId((cur) => (cur === id ? rest[0].id : cur));
    pending.current.delete(id);

    await deleteDraft(id);
  }, [publish, schedule]);

  const active = drafts.find((d) => d.id === activeId) ?? null;
  return { drafts, active, activeId, setActiveId, update, create, remove, loaded, flush };
}
