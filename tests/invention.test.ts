import { inventionCheck } from "../src/domain/invention";
import { EXAMPLES, FIXTURES, FIXTURE_E2B, E2_EXAMPLE_ANSWERS } from "../src/fixtures/examples";

describe("inventionCheck", () => {
  it("gives zero flags for every fixture against its own source text", () => {
    for (const e of EXAMPLES) expect(inventionCheck(FIXTURES[e.id], e.notes)).toEqual([]);
    const e2bSource = [EXAMPLES[1].notes, ...E2_EXAMPLE_ANSWERS].join("\n");
    expect(inventionCheck(FIXTURE_E2B, e2bSource)).toEqual([]);
  });
  it("flags a made-up Chrome version", () => {
    const r = { ...FIXTURES["filter-reset"], environment: ["Chrome on Mac", "Chrome 131"] };
    const flags = inventionCheck(r, EXAMPLES[0].notes);
    expect(flags).toEqual([{ field: "environment", index: 1, kind: "version", text: "131" }]);
  });
  it("flags a browser that isn't in the notes", () => {
    const r = { ...FIXTURES["filter-reset"], environment: ["Safari on Mac"] };
    expect(inventionCheck(r, EXAMPLES[0].notes).map((f) => f.text)).toEqual(["Safari"]);
  });
  it("lets 'mac' in the notes cover macOS", () => {
    const r = { ...FIXTURES["filter-reset"], environment: ["Chrome on macOS"] };
    expect(inventionCheck(r, EXAMPLES[0].notes)).toEqual([]);
  });
  it("flags URLs and quotes not in the source", () => {
    const r = { ...FIXTURES["filter-reset"], steps: ['Open https://shop.example.com/tents and pick "Large".'] };
    const texts = inventionCheck(r, EXAMPLES[0].notes).map((f) => f.kind);
    expect(texts).toEqual(["url", "quoted"]);
  });
  it("skips accepted flags", () => {
    const r = { ...FIXTURES["filter-reset"], environment: ["Chrome 131"] };
    expect(inventionCheck(r, EXAMPLES[0].notes, ["131"])).toEqual([]);
  });
});
