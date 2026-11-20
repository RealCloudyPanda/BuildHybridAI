import { buildPrompt, estimateTokens, NOTES_CHAR_LIMIT } from "../src/domain/prompt";
import { EXAMPLES, FIXTURES } from "../src/fixtures/examples";

describe("buildPrompt", () => {
  it("matches the snapshot for E1 with one answer and one locked field", () => {
    const p = buildPrompt({
      notes: EXAMPLES[0].notes,
      answers: [{ question: FIXTURES["filter-reset"].missing_info[0].question, field: "environment", answer: "Chrome 142", answeredAt: 1 }],
      report: FIXTURES["filter-reset"],
      locked: ["expected"],
    });
    expect(p).toMatchSnapshot();
    expect(p).toContain("CLARIFICATIONS\nQ: Which Chrome version");
    expect(p).toContain("CONFIRMED FIELDS\nexpected: The list still shows only tents");
  });
  it("leaves out empty sections", () => {
    const p = buildPrompt({ notes: "x", answers: [], report: null, locked: [] });
    expect(p).not.toContain("\nCLARIFICATIONS\n");
    expect(p).not.toContain("\nCONFIRMED FIELDS\n");
    expect(p).toContain('NOTES\n"""\nx\n"""');
  });
  it("keeps a 4,000-char prompt under the 4096-token device limit", () => {
    const p = buildPrompt({ notes: "a".repeat(NOTES_CHAR_LIMIT), answers: [], report: null, locked: [] });
    expect(estimateTokens(p)).toBeLessThan(4096);
  });
});
