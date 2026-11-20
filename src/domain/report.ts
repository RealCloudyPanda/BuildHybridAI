export const REPORT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    expected: { type: "string" },
    actual: { type: "string" },
    environment: { type: "array", items: { type: "string" } },
    missing_info: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: ["steps", "expected", "actual", "environment", "frequency", "other"] },
          question: { type: "string" },
        },
        required: ["field", "question"],
      },
    },
  },
  required: ["title", "steps", "expected", "actual", "environment", "missing_info"],
} as const;

export type Field = "title" | "steps" | "expected" | "actual" | "environment";
export type MissingField = "steps" | "expected" | "actual" | "environment" | "frequency" | "other";
export const MISSING_FIELDS: MissingField[] = ["steps", "expected", "actual", "environment", "frequency", "other"];

export interface Report {
  title: string;
  steps: string[];
  expected: string;
  actual: string;
  environment: string[];
  missing_info: { field: MissingField; question: string }[];
}

export class ReportParseError extends Error {
  constructor(message: string, public raw: string) {
    super(message);
    this.name = "ReportParseError";
  }
}

export function emptyReport(): Report {
  return { title: "", steps: [], expected: "", actual: "", environment: [], missing_info: [] };
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strArr = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];

/** Tolerant parser for model output: strips fences, finds the JSON object, coerces shapes. */
export function parseReport(text: string): Report {
  const unfenced = text.replace(/```(?:json)?/gi, "").trim();
  let data = tryParse(unfenced);
  if (data === undefined) {
    const a = unfenced.indexOf("{");
    const b = unfenced.lastIndexOf("}");
    if (a !== -1 && b > a) data = tryParse(unfenced.slice(a, b + 1));
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ReportParseError("The model reply was not a JSON object.", text);
  }
  const o = data as Record<string, unknown>;
  const missing = Array.isArray(o.missing_info) ? o.missing_info : [];
  const report: Report = {
    title: str(o.title),
    steps: strArr(o.steps).slice(0, 15),
    expected: str(o.expected),
    actual: str(o.actual),
    environment: strArr(o.environment),
    missing_info: missing
      .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
      .map((m) => {
        const field = str(m.field) as MissingField;
        return { field: MISSING_FIELDS.includes(field) ? field : "other", question: str(m.question) };
      })
      .filter((m) => m.question)
      .slice(0, 4),
  };
  if (!report.title && report.steps.length === 0 && !report.actual) {
    throw new ReportParseError("The model reply had no title, steps or actual result.", text);
  }
  return report;
}
