import { runSample } from "../src/engine/sample";
import { EXAMPLES, FIXTURES, FIXTURE_E2B, E2_EXAMPLE_ANSWERS } from "../src/fixtures/examples";
import { mergeLocked } from "../src/domain/merge";

const base = { answers: [], locked: [], report: null };

describe("runSample", () => {
  it.each(EXAMPLES.map((e) => [e.id, e] as const))("returns the %s fixture", (_id, e) => {
    expect(runSample({ ...base, notes: e.notes, exampleId: e.id })).toEqual(FIXTURES[e.id]);
  });
  it("returns E2b when all four E2 questions are answered", () => {
    const qs = FIXTURES.vague.missing_info;
    const answers = qs.map((q, i) => ({ question: q.question, field: q.field, answer: E2_EXAMPLE_ANSWERS[i], answeredAt: 1 }));
    expect(runSample({ ...base, notes: EXAMPLES[1].notes, exampleId: "vague", answers })).toEqual(FIXTURE_E2B);
  });
  it("uses the rule engine for other notes", () => {
    const r = runSample({ ...base, notes: "opened settings, changed language to French, saved, page still in English. expected French. firefox" });
    expect(r.steps.length).toBeGreaterThanOrEqual(2);
    expect(r.actual).toContain("still in English");
    expect(r.expected).toContain("French");
    expect(r.environment).toEqual(["Firefox"]);
    expect(r.missing_info.some((m) => /version/i.test(m.question))).toBe(true);
  });
  it("fills a field from an answer", () => {
    const r = runSample({ ...base, notes: "clicked save, nothing happens", answers: [{ question: "Which browser?", field: "environment", answer: "Safari on iPhone", answeredAt: 1 }] });
    expect(r.environment[0]).toMatch(/Safari/);
  });
});

describe("mergeLocked", () => {
  it("keeps a locked field", () => {
    const prev = { ...FIXTURES["filter-reset"], expected: "My own words" };
    const next = mergeLocked(FIXTURES["filter-reset"], prev, ["expected"]);
    expect(next.expected).toBe("My own words");
    expect(next.title).toBe(FIXTURES["filter-reset"].title);
  });
});
