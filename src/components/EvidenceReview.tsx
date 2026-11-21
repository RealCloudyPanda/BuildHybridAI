import { evidenceFor } from '../domain/evidence';
import type { Draft } from '../domain/types';
export function EvidenceReview({ draft }: { draft: Draft }) {
  const evidence = evidenceFor(draft);
  return <details className="card"><summary>Source evidence and handoff review</summary>
    <p>Source match means literal overlap. Tester confirmation records your review. Neither proves the bug.</p>
    {draft.lastRun?.inputNotes !== undefined && draft.lastRun.inputNotes !== draft.notes && <p role="status">Notes changed since this report. Run again before handoff.</p>}
    {draft.lastRun && draft.lastRun.inputNotes === undefined && <p>Older draft: input snapshot unavailable. Review against your notes.</p>}
    <ul>{evidence.map((e, i) => <li key={i}><strong>{e.field}: {e.status}</strong><p>{e.text}</p>{e.excerpt && <details><summary>Source excerpt</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{e.excerpt}</pre></details>}</li>)}</ul>
    <p>Before handoff: check each step, expected and actual results, environment and open questions. Confirm edited fields using their lock controls.</p>
  </details>;
}
