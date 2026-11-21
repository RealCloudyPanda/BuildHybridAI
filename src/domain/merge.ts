import type { Field, Report } from "./report";

export function mergeLocked(next: Report, previous: Report | null, locked: Field[]): Report {
  if (!previous || locked.length === 0) return next;
  const out: Report = { ...next };
  for (const f of locked) {
    if (f === "steps" || f === "environment") out[f] = [...previous[f]];
    else out[f] = previous[f];
  }
  return out;
}
