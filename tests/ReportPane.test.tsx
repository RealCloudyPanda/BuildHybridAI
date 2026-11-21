import { render, screen } from "@testing-library/react";
import { ReportPane } from "../src/components/ReportPane";
import { newDraft } from "../src/store/drafts";
import { FIXTURES, EXAMPLES } from "../src/fixtures/examples";

const noop = () => {};
const props = { running: null, error: null, onEdit: noop, onToggleLock: noop, onOpenEngine: noop, onRetry: noop, onSwitchHybrid: noop };

describe("ReportPane", () => {
  it("shows the empty state", () => {
    render(<ReportPane {...props} draft={newDraft()} />);
    expect(screen.getByText(/Nothing is sent anywhere/)).toBeInTheDocument();
  });
  it("renders gaps for the vague example", () => {
    const d = { ...newDraft(EXAMPLES[1]), report: FIXTURES.vague, lastRun: { source: "sample" as const, ms: 651, availabilityBefore: null, at: 1, privacy: "hybrid" as const } };
    render(<ReportPane {...props} draft={d} />);
    expect(screen.getAllByText("Needs info")).toHaveLength(3);
    expect(screen.getByText(/Sample · no AI/)).toBeInTheDocument();
    expect(screen.getByLabelText("Expected")).toHaveClass("gap");
  });
  it("marks locked fields", () => {
    const d = { ...newDraft(EXAMPLES[0]), report: FIXTURES["filter-reset"], locked: ["expected" as const] };
    render(<ReportPane {...props} draft={d} />);
    expect(screen.getByRole("button", { name: /Locked: kept on re-run \(expected\)/ })).toHaveAttribute("aria-pressed", "true");
  });
});
