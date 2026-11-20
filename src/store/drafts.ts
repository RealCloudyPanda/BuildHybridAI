import { get, set, del, keys, getMany } from "idb-keyval";
import type { Draft } from "../domain/types";
import type { Example } from "../fixtures/examples";
import { scanSensitive } from "../domain/sensitivity";

const key = (id: string) => `draft:${id}`;

export async function listDrafts(): Promise<Draft[]> {
  const ks = (await keys()).filter((k): k is string => typeof k === "string" && k.startsWith("draft:"));
  const ds = (await getMany<Draft | undefined>(ks)).filter((d): d is Draft => !!d);
  return ds.sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getDraft = (id: string) => get<Draft>(key(id));
export const saveDraft = (d: Draft) => set(key(d.id), d);
export const deleteDraft = (id: string) => del(key(id));

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function newDraft(example?: Example): Draft {
  const now = Date.now();
  const notes = example?.notes ?? "";
  return {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    exampleId: example?.id,
    notes,
    privacy: scanSensitive(notes).length ? "local-only" : "hybrid",
    privacyOverride: false,
    answers: [],
    report: null,
    locked: [],
    acceptedFlags: [],
    lastRun: null,
  };
}
