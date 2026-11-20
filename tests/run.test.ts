import { runEngine } from "../src/engine/run";
import { EXAMPLES, FIXTURES } from "../src/fixtures/examples";

const firebaseTouched = vi.fn();
vi.mock("firebase/ai", () => { firebaseTouched(); return {}; });
vi.mock("firebase/app", () => { firebaseTouched(); return {}; });

const sample = { firebaseConfig: null, recaptchaSiteKey: "", appCheckDebugToken: "" };

describe("runEngine (Sample mode)", () => {
  it("returns the fixture with source sample and never loads Firebase", async () => {
    const r = await runEngine({ notes: EXAMPLES[0].notes, exampleId: "filter-reset", answers: [], locked: [], report: null }, "hybrid", sample);
    expect(r.source).toBe("sample");
    expect(r.availabilityBefore).toBeNull();
    expect(r.report).toEqual(FIXTURES["filter-reset"]);
    expect(r.ms).toBeGreaterThanOrEqual(600);
    expect(firebaseTouched).not.toHaveBeenCalled();
  });
  it("keeps a locked expected field across runs", async () => {
    const prev = { ...FIXTURES["filter-reset"], expected: "Tents stay selected." };
    const r = await runEngine({ notes: EXAMPLES[0].notes, exampleId: "filter-reset", answers: [], locked: ["expected"], report: prev }, "hybrid", sample);
    expect(r.report.expected).toBe("Tents stay selected.");
  });
});
