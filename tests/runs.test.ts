import { createRuns, type RunState } from "../src/engine/runs";
import { newDraft } from "../src/store/drafts";
import { FIXTURES } from "../src/fixtures/examples";
import type { Draft, RunResult, Settings } from "../src/domain/types";
import { runEngine } from "../src/engine/run";

const settings: Settings = { firebaseConfig: null, recaptchaSiteKey: "", appCheckDebugToken: "" };
const result: RunResult = { report: FIXTURES.vague, source: "sample", ms: 1, availabilityBefore: null };
function harness(execute: typeof runEngine = vi.fn<typeof runEngine>().mockResolvedValue(result)) {
  const draft = newDraft();
  const records = new Map([[draft.id, draft]]);
  const states = new Map<string, RunState>();
  const runs = createRuns(settings, {
    update(id, patch) {
      const current = records.get(id);
      if (current) records.set(id, { ...current, ...(typeof patch === "function" ? patch(current) : patch) });
    },
    changed: (id, state) => { states.set(id, state); },
  }, execute);
  return { ...runs, draft, records, states, execute };
}
function pending() {
  let resolve!: (value: RunResult) => void;
  let reject!: (cause: Error) => void;
  const promise = new Promise<RunResult>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

it("rescans the complete prompt including submitted answers and locked fields before execution", async () => {
  for (const source of ["answer", "locked"]) {
    const h = harness();
    const draft = { ...h.draft, notes: "Save fails", report: { ...FIXTURES.vague, title: "qa@example.com" }, locked: source === "locked" ? ["title" as const] : [] };
    h.records.set(draft.id, draft);
    const answers = source === "answer" ? [{ question: "Who?", field: "actual" as const, answer: "qa@example.com", answeredAt: 1 }] : [];
    await h.run(draft, answers);
    expect(h.execute).toHaveBeenCalledWith(expect.objectContaining({ answers }), "local-only", settings);
    expect(h.records.get(draft.id)?.lastRun?.privacy).toBe("local-only");
    expect(h.states.get(draft.id)).toEqual({ running: null, error: null });
  }
});

it("honors an explicit Hybrid override and retains submitted answers when a run fails", async () => {
  const h = harness(vi.fn<typeof runEngine>().mockRejectedValue(new Error("offline")));
  const draft = { ...h.draft, notes: "qa@example.com", privacyOverride: true };
  h.records.set(draft.id, draft);
  const answers = [{ question: "What?", field: "actual" as const, answer: "failed", answeredAt: 1 }];
  expect(await h.run(draft, answers)).toBe("failed");
  expect(h.execute).toHaveBeenCalledWith(expect.anything(), "hybrid", settings);
  expect(h.records.get(draft.id)?.answers).toEqual(answers);
  expect(h.states.get(draft.id)?.running).toBeNull();
  expect(h.states.get(draft.id)?.error).toBeTruthy();
});

it.each<Partial<Draft>>([
  { notes: "edited" }, { privacy: "local-only" }, { privacyOverride: true },
  { locked: ["title"] }, { report: FIXTURES.vague },
  { answers: [{ question: "?", field: "actual", answer: "edited", answeredAt: 1 }] },
])("rejects a completed result after a run input changes: %j", async (edit) => {
  const deferred = pending();
  const h = harness(vi.fn<typeof runEngine>().mockReturnValue(deferred.promise));
  const running = h.run(h.draft);
  h.records.set(h.draft.id, { ...h.records.get(h.draft.id)!, ...edit });
  deferred.resolve(result);
  expect(await running).toBe("stale");
  expect(h.records.get(h.draft.id)?.lastRun).toBeNull();
});

it("keeps a newer run active when an older run completes or rejects", async () => {
  for (const fails of [false, true]) {
    const first = pending(); const second = pending();
    const h = harness(vi.fn<typeof runEngine>().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise));
    const older = h.run(h.draft);
    const newer = h.run(h.records.get(h.draft.id)!);
    if (fails) first.reject(new Error("late error")); else first.resolve(result);
    expect(await older).toBe("superseded");
    expect(h.states.get(h.draft.id)?.running).toBeTruthy();
    expect(h.states.get(h.draft.id)?.error).toBeNull();
    second.resolve(result);
    expect(await newer).toBe("applied");
    expect(h.records.get(h.draft.id)?.lastRun?.runId).toBe(2);
  }
});

it("applies a run to its originating draft after switching and ignores deleted drafts", async () => {
  const first = pending(); const second = pending();
  const h = harness(vi.fn<typeof runEngine>().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise));
  const another = newDraft(); h.records.set(another.id, another);
  const running = h.run(h.draft);
  h.records.set(h.draft.id, { ...h.records.get(h.draft.id)!, updatedAt: 999 });
  first.resolve(result);
  expect(await running).toBe("applied");
  expect(h.records.get(another.id)?.lastRun).toBeNull();
  const deleted = h.run(another);
  h.records.delete(another.id);
  second.resolve(result);
  expect(await deleted).toBe("stale");
  expect(h.records.has(another.id)).toBe(false);
});

it("uses the offline Sample adapter and keeps locked fields through the caller interface", async () => {
  const h = harness(runEngine);
  const draft = { ...h.draft, notes: "Save fails", report: { ...FIXTURES.vague, expected: "Keep this." }, locked: ["expected" as const] };
  h.records.set(draft.id, draft);
  expect(await h.run(draft)).toBe("applied");
  expect(h.records.get(draft.id)?.report?.expected).toBe("Keep this.");
  expect(h.records.get(draft.id)?.lastRun?.source).toBe("sample");
});

it("keeps the newest report when an older run finishes after it", async () => {
  const first = pending(); const second = pending();
  const h = harness(vi.fn<typeof runEngine>().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise));
  const older = h.run(h.draft);
  const newer = h.run(h.records.get(h.draft.id)!);
  second.resolve({ ...result, report: { ...result.report, title: "Newest report" } });
  expect(await newer).toBe("applied");
  first.resolve({ ...result, report: { ...result.report, title: "Obsolete report" } });
  expect(await older).toBe("superseded");
  expect(h.records.get(h.draft.id)?.report?.title).toBe("Newest report");
  expect(h.states.get(h.draft.id)).toEqual({ running: null, error: null });
});
