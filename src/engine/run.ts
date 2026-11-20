import type { Field, Report } from "../domain/report";
import { parseReport, ReportParseError } from "../domain/report";
import { buildPrompt } from "../domain/prompt";
import { mergeLocked } from "../domain/merge";
import type { Answer, ExampleId, Privacy, RunResult, Settings } from "../domain/types";
import { runSample } from "./sample";
import { EngineError } from "./errors";

export interface RunInput {
  notes: string;
  answers: Answer[];
  exampleId?: ExampleId;
  locked: Field[];
  report: Report | null;
}

export const SAMPLE_DELAY_MS = 650;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chooses Sample vs Live (Firebase AI Logic), times the run and keeps locked fields. */
export async function runEngine(input: RunInput, privacy: Privacy, settings: Settings): Promise<RunResult> {
  const t0 = performance.now();
  if (!settings.firebaseConfig) {
    await delay(SAMPLE_DELAY_MS);
    const report = mergeLocked(runSample(input), input.report, input.locked);
    return { report, source: "sample", ms: Math.round(performance.now() - t0), availabilityBefore: null };
  }
  // Live path: loaded on demand so Sample mode never touches the Firebase SDK.
  const [{ initFirebase }, { runHybrid }] = await Promise.all([import("./firebase"), import("./hybrid")]);
  const fb = initFirebase(settings);
  if (!fb) throw new EngineError("unknown", "Firebase is not configured.");
  const prompt = buildPrompt(input);
  let out = await runHybrid(fb.ai, prompt, privacy);
  let report: Report;
  try {
    report = parseReport(out.text);
  } catch (e) {
    if (!(e instanceof ReportParseError)) throw e;
    out = await runHybrid(fb.ai, prompt, privacy); // one retry
    try {
      report = parseReport(out.text);
    } catch {
      throw new EngineError("parse");
    }
  }
  return {
    report: mergeLocked(report, input.report, input.locked),
    source: out.source,
    ms: Math.round(performance.now() - t0),
    availabilityBefore: out.availabilityBefore,
    rawText: out.text,
  };
}
