import { render, screen, fireEvent } from "@testing-library/react";
import { MissingInfo } from "../src/components/MissingInfo";
import { newDraft } from "../src/store/drafts";
import { EXAMPLES, FIXTURES, E2_EXAMPLE_ANSWERS } from "../src/fixtures/examples";
import { buildPrompt } from "../src/domain/prompt";
import type { Answer } from "../src/domain/types";

describe("MissingInfo", () => {
  it("fills example answers and sends them into the next prompt", () => {
    const d = { ...newDraft(EXAMPLES[1]), report: FIXTURES.vague };
    const onSubmit = vi.fn();
    render(<MissingInfo draft={d} running={false} showExampleFill exampleAnswers={E2_EXAMPLE_ANSWERS} onSubmit={onSubmit} />);
    const btn = screen.getByRole("button", { name: "Update report" });
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Fill example answers" }));
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    const answers: Answer[] = onSubmit.mock.calls[0][0];
    expect(answers).toHaveLength(4);
    const prompt = buildPrompt({ notes: d.notes, answers, report: d.report, locked: [] });
    expect(prompt).toContain("A: Firefox on Windows laptop.");
    expect(prompt).toContain("Q: Which browser and device were you using?");
  });
  it("enables Update report after one answer", () => {
    const d = { ...newDraft(EXAMPLES[0]), report: FIXTURES["filter-reset"] };
    render(<MissingInfo draft={d} running={false} showExampleFill={false} onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Which Chrome version/), { target: { value: "142" } });
    expect(screen.getByRole("button", { name: "Update report" })).toBeEnabled();
  });
});
