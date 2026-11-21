import type { Draft, Field } from './types';
export type EvidenceStatus = 'source match' | 'tester confirmed' | 'needs review';
export interface Evidence { field: Field; text: string; status: EvidenceStatus; excerpt?: string }
/** Literal source support only; this deliberately makes no truth/confidence claim. */
export function evidenceFor(draft: Draft): Evidence[] {
  if (!draft.report) return [];
  const sources = [draft.notes, ...draft.answers.map((a) => a.answer)];
  const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return (['title', 'steps', 'expected', 'actual', 'environment'] as Field[]).flatMap((field) => {
    const raw = draft.report![field];
    return (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((text) => {
      const normalized = normalize(text);
      const excerpt = normalized ? sources.find((s) => (" " + normalize(s) + " ").includes(" " + normalized + " ")) : undefined;
      return { field, text, status: draft.locked.includes(field) ? 'tester confirmed' : excerpt ? 'source match' : 'needs review', excerpt } as Evidence;
    });
  });
}
