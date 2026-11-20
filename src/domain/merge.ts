import type { Field, Report } from "./report";

/** Copies locked fields from the previous report so a re-run never changes them. */
export function mergeLocked(next: Report, previous: Report | null, locked: Field[]): Report {
  if (!previous || locked.length === 0) return next;
  const out: Report = { ...next };
  for (const f of locked) {
    if (f === "steps" || f === "environment") out[f] = [...previous[f]];
    else out[f] = previous[f];
  }
  return out;
}
