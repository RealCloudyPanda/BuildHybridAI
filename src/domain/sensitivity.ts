export type SensitiveKind = "email" | "ip" | "internal-host" | "jwt" | "bearer" | "secret-like";
export interface SensitiveMatch { kind: SensitiveKind; text: string; start: number; end: number }

const PATTERNS: [SensitiveKind, RegExp][] = [
  ["email", /[\w.+-]+@[\w-]+(\.[\w-]+)+/gi],
  ["ip", /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
  [
    "internal-host",
    /\b(?:https?:\/\/)?(?:localhost|(?:staging|dev|qa|admin)\.[\w.-]+|[\w-]+(?:\.[\w-]+)*\.(?:internal|corp|local|lan|intranet))(?::\d+)?(?:\/[^\s"'<>]*)?/gi,
  ],
  ["jwt", /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g],
  ["bearer", /\bbearer\s+[\w.~+/-]{12,}/gi],
  ["secret-like", /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g],
];

const LABELS: Record<SensitiveKind, string> = {
  email: "an email",
  ip: "an IP address",
  "internal-host": "an internal URL",
  jwt: "a token",
  bearer: "a token",
  "secret-like": "a token",
};

/** Finds emails, internal hosts, IPs and token-like strings. Overlapping matches keep the earliest, longest one. */
export function scanSensitive(text: string): SensitiveMatch[] {
  const all: SensitiveMatch[] = [];
  for (const [kind, re] of PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      all.push({ kind, text: m[0], start, end: start + m[0].length });
    }
  }
  all.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: SensitiveMatch[] = [];
  for (const m of all) {
    const last = out[out.length - 1];
    if (last && m.start < last.end) continue;
    out.push(m);
  }
  return out;
}

export function labelsFor(matches: SensitiveMatch[]): string[] {
  const order = ["an internal URL", "an email", "an IP address", "a token"];
  const found = new Set(matches.map((m) => LABELS[m.kind]));
  return order.filter((l) => found.has(l));
}

const joinList = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** "Found an internal URL, an email and a token." */
export function summarise(matches: SensitiveMatch[]): string {
  const labels = labelsFor(matches);
  return labels.length ? `Found ${joinList(labels)}.` : "";
}

export { joinList };
