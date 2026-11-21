import type { Field, MissingField, Report } from "../domain/report";
import type { Answer, ExampleId } from "../domain/types";

export interface SampleInput {
  notes: string;
  answers: Answer[];
  exampleId?: ExampleId;
  locked: Field[];
  report: Report | null;
}

const BROWSERS = ["Chrome", "Chromium", "Safari", "Firefox", "Edge", "Opera", "Brave", "Samsung Internet", "Arc"];
const OSES: [RegExp, string][] = [
  [/\bmac\s?os\b|\bos x\b|\bmac\b/i, "Mac"],
  [/\bwindows\b|\bwin(10|11)?\b/i, "Windows"],
  [/\bubuntu\b/i, "Ubuntu"],
  [/\blinux\b/i, "Linux"],
  [/\bipados\b/i, "iPadOS"],
  [/\bios\b/i, "iOS"],
  [/\bandroid\b/i, "Android"],
  [/\bchrome ?os\b/i, "ChromeOS"],
];
const DEVICES = ["iPhone", "iPad", "Pixel", "Galaxy", "MacBook", "Surface", "desktop", "laptop", "tablet", "phone"];

const ACTION = /\b(open|opened|click|clicked|tap|tapped|select|selected|pick|picked|choose|chose|change|changed|go|went|press|pressed|hit|type|typed|enter|entered|scroll|scrolled|add|added|remove|removed|submit|submitted|log in|logged in|sign in|navigate|navigated|back)\b/i;
const ACTUAL = /\b(instead|shows|showing|reset|resets|gone|broke|broken|error|crash|fails|failed|nothing happens|doesn't|didn't|not working|blank|stuck|wrong|still)\b/i;
const EXPECTED = /\b(expected|expect|should|supposed to)\b/i;
const FREQUENCY = /\b(every time|always|sometimes|once|each time|intermittent)/i;

export function splitClauses(text: string): string[] {
  return text
    .split(/\n|->|→|;|\.(?!\d)\s|,\s*and then\s|,\s*then\s|\sthen\s|,\s/i)
    .map((c) => c.trim().replace(/^\d+[.)]\s+/, "").replace(/[.\s]+$/, ""))
    .filter((c) => c.length > 1);
}

const sentence = (s: string) => {
  const t = s.trim().replace(/[.\s]+$/, "");
  return t ? t[0].toUpperCase() + t.slice(1) + "." : "";
};
const word = (re: RegExp, s: string) => re.test(s);

function environmentOf(source: string): { env: string[]; browser?: string } {
  const browser = BROWSERS.find((b) => word(new RegExp(`\\b${b}\\b`, "i"), source));
  const os = OSES.find(([re]) => re.test(source))?.[1];
  const device = DEVICES.find((d) => word(new RegExp(`\\b${d}\\b`, "i"), source));
  const parts: string[] = [];
  if (browser) {
    const version = source.match(new RegExp(`\\b${browser}\\s+(?:v(?:ersion)?\\s*)?(\\d+(?:\\.\\d+)*)`, "i"))?.[1];
    parts.push(version ? `${browser} ${version}` : browser);
  }
  if (os) parts.push(parts.length ? `on ${os}` : os);
  if (device && device.toLowerCase() !== (os ?? "").toLowerCase()) parts.push(parts.length ? device : device[0].toUpperCase() + device.slice(1));
  return { env: parts.length ? [parts.join(" ")] : [], browser };
}

/** Deterministic, rule-based report writer. No AI. */
export function ruleEngine(source: string): Report {
  const clauses = splitClauses(source);
  const actualClause = clauses.find((c) => (/^actual\s*:/i.test(c) || ACTUAL.test(c)) && !EXPECTED.test(c));
  const expectedClause = clauses.find((c) => EXPECTED.test(c));
  const steps = clauses
    .filter((c) => c !== actualClause && c !== expectedClause && (ACTION.test(c) || /^steps?\s*:/i.test(c)))
    .map((c) => sentence(c.replace(/^steps?\s*:\s*/i, "")))
    .slice(0, 10);
  const expected = expectedClause
    ? sentence(expectedClause.replace(/^.*?\b(expected|expect)\b(\s+to)?\s*:?\s*/i, "").replace(/^it\s+/i, "It "))
    : "";
  const actual = actualClause ? sentence(actualClause.replace(/^actual\s*:\s*/i, "")) : "";
  const { env, browser } = environmentOf(source);
  const titleBase = (actualClause ?? clauses[0] ?? "Bug report").replace(/[.\s]+$/, "");
  const title = (titleBase[0]?.toUpperCase() ?? "") + titleBase.slice(1, 80);

  const q: { field: MissingField; question: string }[] = [];
  if (!steps.length) q.push({ field: "steps", question: "What did you do, step by step, before the problem appeared?" });
  if (!actual) q.push({ field: "actual", question: "What happened that looked wrong?" });
  if (!expected) q.push({ field: "expected", question: "What did you expect to happen instead?" });
  if (!env.length) q.push({ field: "environment", question: "Which browser and device were you using?" });
  else if (browser && !new RegExp(`${browser}\\s*v?\\d`, "i").test(source))
    q.push({ field: "environment", question: `Which ${browser} version were you using?` });
  if (!FREQUENCY.test(source)) q.push({ field: "frequency", question: "Does this happen every time, or only sometimes?" });

  return { title, steps, expected, actual, environment: env, missing_info: q.slice(0, 4) };
}

export function runSample(input: SampleInput): Report {
  const { notes, answers } = input;
  const answered = answers.filter((a) => a.answer.trim());
  const source = [notes, ...answered.map((a) => a.answer)].join("\n");
  const report = ruleEngine(source);
  // Clarifications target their named fields; an answer is not proof of completeness.
  for (const answer of answered) {
    const value = sentence(answer.answer);
    if (answer.field === "expected" || answer.field === "actual") report[answer.field] = value;
    if (answer.field === "environment") report.environment = [answer.answer.trim()];
    if (answer.field === "steps") report.steps = splitClauses(answer.answer).map(sentence);
  }
  const populated = (field: MissingField) => field === "frequency" ? FREQUENCY.test(source)
    : field === "other" ? false : Array.isArray(report[field]) ? report[field].length > 0 : !!report[field];
  report.missing_info = report.missing_info.filter((m) => !answered.some((a) => a.field === m.field) || !populated(m.field));
  const expected = clausesFor(notes, answered, "expected");
  if (expected.length > 1) report.missing_info.unshift({ field: "other", question: "Several expected results were supplied. Confirm which applies: " + expected.join(" / ") });
  report.missing_info = report.missing_info.slice(0, 4);
  return report;
}

function clausesFor(notes: string, answers: Answer[], field: "expected"): string[] {
  return [...new Set([...splitClauses(notes).filter((c) => EXPECTED.test(c)), ...answers.filter((a) => a.field === field).map((a) => a.answer)].map((s) => s.trim().toLowerCase()))];
}
