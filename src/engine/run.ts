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

export async function runEngine(input: RunInput, privacy: Privacy, settings: Settings): Promise<RunResult> {
  const t0 = performance.now();
  const result = await (settings.firebaseConfig ? firebaseRun : sampleRun)(input, privacy, settings);
  return { ...result, report: mergeLocked(result.report, input.report, input.locked),
    ms: Math.round(performance.now() - t0) };
}

type Execution = Omit<RunResult, "ms">;

async function sampleRun(input: RunInput): Promise<Execution> {
  await delay(SAMPLE_DELAY_MS);
  return { report: runSample(input), source: "sample", availabilityBefore: null };
}

async function firebaseRun(input: RunInput, privacy: Privacy, settings: Settings): Promise<Execution> {
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
    out = await runHybrid(fb.ai, prompt, privacy);
    try {
      report = parseReport(out.text);
    } catch {
      throw new EngineError("parse");
    }
  }
  return {
    report,
    source: out.source,
    availabilityBefore: out.availabilityBefore,
    rawText: out.text,
  };
}
