import type { Report } from "./report";
import type { Source } from "./types";

const SOURCE: Record<Source, string> = { on_device: "On device", in_cloud: "In cloud", sample: "Sample, no AI" };

export function toMarkdown(r: Report, source?: Source): string {
  const out = [`## ${r.title || "Untitled bug"}`, "", "**Steps to reproduce**"];
  r.steps.forEach((s, i) => out.push(`${i + 1}. ${s}`));
  out.push("", "**Expected**", r.expected || "_Needs info_", "", "**Actual**", r.actual || "_Needs info_", "", "**Environment**");
  if (r.environment.length) r.environment.forEach((e) => out.push(`- ${e}`));
  else out.push("- _Needs info_");
  if (r.missing_info.length) {
    out.push("", "**Open questions**");
    r.missing_info.forEach((m) => out.push(`- ${m.question}`));
  }
  if (source) out.push("", `_Written with Repro Offline (source: ${SOURCE[source]})_`);
  return out.join("\n");
}

export function toPlainText(r: Report, source?: Source): string {
  const out = [r.title || "Untitled bug", "", "Steps to reproduce:"];
  r.steps.forEach((s, i) => out.push(`${i + 1}. ${s}`));
  out.push("", `Expected: ${r.expected || "Needs info"}`, `Actual: ${r.actual || "Needs info"}`, `Environment: ${r.environment.join(", ") || "Needs info"}`);
  if (r.missing_info.length) {
    out.push("", "Open questions:");
    r.missing_info.forEach((m) => out.push(`- ${m.question}`));
  }
  if (source) out.push("", `Written with Repro Offline (source: ${SOURCE[source]})`);
  return out.join("\n");
}
