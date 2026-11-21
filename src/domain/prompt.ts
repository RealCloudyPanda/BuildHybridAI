import type { Report, Field } from "./report";
import type { Answer } from "./types";

export const NOTES_CHAR_LIMIT = 4000;
export const estimateTokens = (s: string) => Math.ceil(s.length / 4);

const RULES = `You turn a software tester's rough notes into a bug report that another developer can follow to reproduce the bug.

RULES
1. Use ONLY facts stated in NOTES, CLARIFICATIONS and CONFIRMED FIELDS.
2. Never add a browser, version, operating system, device, URL, number, error message, step or cause that is not stated there.
3. If something a developer needs is not stated, leave that field empty ("" or []) and ask about it in missing_info.
4. title: one line, under 80 characters, describing the wrong behaviour.
5. steps: short imperative sentences, one action each, in the order they happened.
6. expected: what the tester says should happen. actual: what happened instead.
7. environment: only browser, operating system, device, account type or build that are stated.
8. missing_info: at most 4 questions, most important first. Do not ask about anything already answered.
9. Copy every CONFIRMED FIELD exactly as given.
10. Reply with JSON only.`;

export interface PromptInput {
  notes: string;
  answers: Answer[];
  report: Report | null;
  locked: Field[];
}

export function buildPrompt({ notes, answers, report, locked }: PromptInput): string {
  const parts = [RULES, `NOTES\n"""\n${notes.trim()}\n"""`];
  const answered = answers.filter((a) => a.answer.trim());
  if (answered.length) {
    parts.push("CLARIFICATIONS\n" + answered.map((a) => `Q: ${a.question}\nA: ${a.answer.trim()}`).join("\n"));
  }
  if (report && locked.length) {
    const lines = locked.map((f) => {
      const v = report[f];
      return `${f}: ${Array.isArray(v) ? JSON.stringify(v) : v}`;
    });
    parts.push("CONFIRMED FIELDS\n" + lines.join("\n"));
  }
  return parts.join("\n\n");
}
