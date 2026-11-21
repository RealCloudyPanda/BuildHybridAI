import type { Field, Report } from "./report";
import type { Draft, Flag, FlagKind } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (src: string, w: string) => new RegExp(`(^|[^a-z0-9])${esc(w.toLowerCase())}($|[^a-z0-9])`).test(src);

const BROWSERS = ["Samsung Internet", "Chromium", "Chrome", "Safari", "Firefox", "Edge", "Opera", "Brave", "Arc"];
const OSES: [string, string[]][] = [
  ["Windows", ["windows", "win"]],
  ["macOS", ["macos", "mac"]],
  ["Mac OS", ["mac os", "mac"]],
  ["OS X", ["os x", "mac"]],
  ["Linux", ["linux"]],
  ["Ubuntu", ["ubuntu"]],
  ["iOS", ["ios"]],
  ["iPadOS", ["ipados"]],
  ["Android", ["android"]],
  ["ChromeOS", ["chromeos", "chrome os"]],
];
const DEVICES: [string, string[]][] = [
  ["iPhone", ["iphone"]],
  ["iPad", ["ipad"]],
  ["Pixel", ["pixel"]],
  ["Galaxy", ["galaxy"]],
  ["MacBook", ["macbook", "mac"]],
  ["Surface", ["surface"]],
  ["desktop", ["desktop"]],
  ["laptop", ["laptop"]],
  ["tablet", ["tablet"]],
  ["mobile", ["mobile", "phone"]],
  ["phone", ["phone"]],
];

export function sourceTextFor(draft: Pick<Draft, "notes" | "answers" | "locked" | "report">): string {
  const parts = [draft.notes, ...draft.answers.map((a) => a.answer)];
  if (draft.report) {
    for (const f of draft.locked) {
      const v = draft.report[f];
      parts.push(Array.isArray(v) ? v.join("\n") : v);
    }
  }
  return parts.join("\n");
}

function fieldTexts(r: Report): { field: Field; index?: number; text: string }[] {
  return [
    { field: "title", text: r.title },
    ...r.steps.map((text, index) => ({ field: "steps" as const, index, text })),
    { field: "expected", text: r.expected },
    { field: "actual", text: r.actual },
    ...r.environment.map((text, index) => ({ field: "environment" as const, index, text })),
  ];
}

const stripPunct = (s: string) => s.replace(/[.,;:!?)\]]+$/, "");

export function inventionCheck(report: Report, sourceText: string, acceptedFlags: string[] = []): Flag[] {
  const src = norm(sourceText);
  const accepted = new Set(acceptedFlags.map((f) => f.toLowerCase()));
  const flags: Flag[] = [];
  const seen = new Set<string>();
  const add = (f: Flag) => {
    const key = `${f.field}:${f.index ?? ""}:${f.text.toLowerCase()}`;
    if (seen.has(key) || accepted.has(f.text.toLowerCase())) return;
    seen.add(key);
    flags.push(f);
  };

  for (const { field, index, text } of fieldTexts(report)) {
    if (!text) continue;
    const t = text;
    const base = { field, index } as const;
    const flag = (kind: FlagKind, s: string) => add({ ...base, kind, text: s });

    const urlSpans: [number, number][] = [];
    for (const m of t.matchAll(/https?:\/\/\S+|\b\w+\.\w{2,}\/\S*/g)) {
      const u = stripPunct(m[0]);
      urlSpans.push([m.index!, m.index! + m[0].length]);
      if (!src.includes(u.toLowerCase())) flag("url", u);
    }
    const inUrl = (i: number) => urlSpans.some(([a, b]) => i >= a && i < b);

    for (const m of t.matchAll(/\b\d+(?:\.\d+)+\b|\bv\d+\b/gi)) {
      if (inUrl(m.index!)) continue;
      const digits = m[0].replace(/^v/i, "");
      if (!src.includes(digits)) flag("version", m[0]);
    }
    for (const b of BROWSERS) {
      const m = new RegExp(`\\b${esc(b)}\\b`, "i").exec(t);
      if (m && !hasWord(src, b) && !(b === "Chrome" && /\bchromium\b/i.test(t) && !/\bchrome\b(?!ium)/i.test(t))) flag("browser", m[0]);
    }
    for (const [name, syn] of OSES) {
      const m = new RegExp(`\\b${esc(name)}\\b`, "i").exec(t);
      if (m && !syn.some((s) => hasWord(src, s))) flag("os", m[0]);
    }
    for (const [name, syn] of DEVICES) {
      const m = new RegExp(`\\b${esc(name)}\\b`, "i").exec(t);
      if (m && !syn.some((s) => hasWord(src, s))) flag("device", m[0]);
    }
    for (const m of t.matchAll(/\b\d+(?:\.\d+)*(?:\s?(?:ms|s|sec|seconds|px|%|items|times))?(?![\w.]*\d)\b/g)) {
      if (inUrl(m.index!)) continue;
      const num = m[0].match(/^\d+(?:\.\d+)*/)![0];
      if (num.includes(".")) continue;
      if (Number(num) < 2) continue;
      if (/^(st|nd|rd|th)\b/i.test(t.slice(m.index! + num.length))) continue;
      if (!hasWord(src, num)) {
        const before = t.slice(0, m.index!);
        const kind: FlagKind = BROWSERS.some((b) => new RegExp(`\\b${esc(b)}\\s*$`, "i").test(before)) ? "version" : "number";
        flag(kind, num);
      }
    }
    for (const m of t.matchAll(/"([^"]{2,40})"|“([^”]{2,40})”|(?:^|\s)'([^']{2,40})'/g)) {
      const q = m[1] ?? m[2] ?? m[3];
      if (q && !src.includes(norm(q))) flag("quoted", q);
    }
  }
  return flags;
}
