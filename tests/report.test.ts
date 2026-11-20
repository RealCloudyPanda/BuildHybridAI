import { parseReport, ReportParseError } from "../src/domain/report";

const base = { title: "T", steps: ["a"], expected: "e", actual: "x", environment: ["Chrome"], missing_info: [] };

describe("parseReport", () => {
  it("parses clean JSON", () => {
    expect(parseReport(JSON.stringify(base))).toEqual(base);
  });
  it("strips code fences", () => {
    expect(parseReport("```json\n" + JSON.stringify(base) + "\n```").title).toBe("T");
  });
  it("finds JSON inside prose", () => {
    expect(parseReport("Here you go: " + JSON.stringify(base) + " Hope it helps").actual).toBe("x");
  });
  it("fills missing arrays", () => {
    const r = parseReport('{"title":"Only title"}');
    expect(r.steps).toEqual([]);
    expect(r.environment).toEqual([]);
    expect(r.missing_info).toEqual([]);
    expect(r.expected).toBe("");
  });
  it("maps unknown missing_info fields to other and caps at 4", () => {
    const mi = Array.from({ length: 6 }, (_, i) => ({ field: i === 0 ? "browser" : "steps", question: "q" + i }));
    const r = parseReport(JSON.stringify({ ...base, missing_info: mi }));
    expect(r.missing_info).toHaveLength(4);
    expect(r.missing_info[0].field).toBe("other");
  });
  it("drops empty steps and non-strings", () => {
    const r = parseReport(JSON.stringify({ ...base, steps: ["one", " ", 3, "two"] }));
    expect(r.steps).toEqual(["one", "two"]);
  });
  it("throws on garbage", () => {
    expect(() => parseReport("no json here")).toThrow(ReportParseError);
    expect(() => parseReport('{"expected":"x"}')).toThrow(ReportParseError);
  });
});
