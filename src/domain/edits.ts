import { emptyReport, type Field, type Report } from "./report";
import type { Flag } from "./types";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function stripText(s: string, text: string): string {
  return s
    .replace(new RegExp(escapeRegExp(text), "i"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

export function removeFlagged(report: Report | null | undefined, f: Flag): Report {
  const r = report ?? emptyReport();
  if (f.field === "environment" && f.index !== undefined) return { ...r, environment: r.environment.filter((_, i) => i !== f.index) };
  if (f.field === "steps" && f.index !== undefined) return { ...r, steps: r.steps.map((s, i) => (i === f.index ? stripText(s, f.text) : s)) };
  if (f.field === "title" || f.field === "expected" || f.field === "actual") return { ...r, [f.field]: stripText(r[f.field], f.text) };
  return { ...r };
}

export function acceptFlag(accepted: readonly string[], f: Flag): string[] {
  return [...new Set([...accepted, f.text.toLowerCase()])];
}

export function editField(report: Report | null | undefined, locked: readonly Field[], field: Field, value: string | string[]) {
  return {
    report: { ...(report ?? emptyReport()), [field]: value } as Report,
    locked: locked.includes(field) ? [...locked] : [...locked, field],
  };
}

export function toggleLock(locked: readonly Field[], f: Field): Field[] {
  return locked.includes(f) ? locked.filter((x) => x !== f) : [...locked, f];
}
