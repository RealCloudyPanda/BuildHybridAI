import { runSample } from "../src/engine/sample";
import { EXAMPLES, FIXTURES } from "../src/fixtures/examples";
import { mergeLocked } from "../src/domain/merge";

const base = { answers: [], locked: [], report: null };

describe("runSample", () => {
  it.each(EXAMPLES)("routes $id through the same pipeline with or without a fixture label", (e) => {
    expect(runSample({ ...base, notes: e.notes, exampleId: e.id })).toEqual(runSample({ ...base, notes: e.notes }));
  });
  it("uses the tester's own clarifications even when all four E2 questions are answered", () => {
    const notes = EXAMPLES[1].notes;
    const values = ["Clicked a sale item, then pressed Back.", "The list reset to All.", "Expected Sale to stay selected.", "Safari on iPhone"];
    const answers = FIXTURES.vague.missing_info.map((q, i) => ({ ...q, answer: values[i], answeredAt: 1 }));
    const report = runSample({ ...base, notes, exampleId: "vague", answers });
    expect(report).toMatchObject({
      actual: "The list reset to All.", expected: "Sale to stay selected.", environment: ["Safari iPhone"],
    });
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
