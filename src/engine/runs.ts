import { buildPrompt } from "../domain/prompt";
import { scanSensitive } from "../domain/sensitivity";
import type { Answer, Draft, Privacy, Settings } from "../domain/types";
import { toEngineError, type EngineError } from "./errors";
import { runEngine } from "./run";

export interface Running { startedAt: number; privacy: Privacy; live: boolean }
export interface RunState { running: Running | null; error: EngineError | null }

type Update = (id: string, patch: Partial<Draft> | ((current: Draft) => Partial<Draft>)) => void;

export function createRuns(settings: Settings, drafts: {
  update: Update;
  changed: (id: string, state: RunState) => void;
}, execute = runEngine) {
  const runIds = new Map<string, number>();
  return {
    async run(draft: Draft, submittedAnswers: Answer[] = draft.answers) {
      const d = structuredClone(draft);
      const answers = structuredClone(submittedAnswers);
      const id = d.id;
      const runId = (runIds.get(id) ?? 0) + 1;
      runIds.set(id, runId);
      const input = { notes: d.notes, answers, exampleId: d.exampleId, locked: d.locked, report: d.report };
      const privacy = d.privacy === "hybrid" && !d.privacyOverride && scanSensitive(buildPrompt(input)).length
        ? "local-only" : d.privacy;
      drafts.update(id, { privacy, answers });
      const fingerprint = inputFingerprint({ ...d, privacy, answers });
      drafts.changed(id, { running: { startedAt: Date.now(), privacy, live: !!settings.firebaseConfig }, error: null });
      let error: EngineError | null = null;
      try {
        const result = await execute(input, privacy, settings);
        if (runIds.get(id) !== runId) return "superseded";
        let outcome = "stale";
        drafts.update(id, (current) => {
          if (inputFingerprint(current) !== fingerprint) return {};
          outcome = "applied";
          return { answers, report: result.report,
            lastRun: { source: result.source, ms: result.ms, availabilityBefore: result.availabilityBefore,
              at: Date.now(), privacy, inputNotes: d.notes, runId } };
        });
        return outcome;
      } catch (cause) {
        if (runIds.get(id) !== runId) return "superseded";
        error = toEngineError(cause);
        return "failed";
      } finally {
        if (runIds.get(id) === runId) drafts.changed(id, { running: null, error });
      }
    },
  };
}

function inputFingerprint(d: Draft): string {
  return JSON.stringify([d.notes, d.answers, d.privacy, d.privacyOverride, d.locked, d.report]);
}
