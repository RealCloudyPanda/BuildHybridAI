import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { NotesPane } from "../src/components/NotesPane";
import { newDraft } from "../src/store/drafts";
import type { Draft } from "../src/domain/types";

function Harness() {
  const [d, setD] = useState<Draft>(newDraft());
  return (
    <>
      <NotesPane draft={d} running={false} onChange={(p) => setD((x) => ({ ...x, ...p }))} onRun={() => {}} />
      <output data-testid="privacy">{d.privacy}</output>
    </>
  );
}

describe("NotesPane", () => {
  it("E3 chip switches to Local-only and shows the banner", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Notes with internal details" }));
    expect(await screen.findByText("Found an internal URL, an email and a token.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Local-only/ })).toHaveAttribute("aria-checked", "true");
  });
  it("keeps Hybrid after the tester overrides it", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Notes with internal details" }));
    await screen.findByText("Found an internal URL, an email and a token.");
    fireEvent.click(screen.getByRole("radio", { name: /Hybrid/ }));
    const ta = screen.getByLabelText("Notes") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: ta.value + " more admin.trailhead.internal" } });
    await new Promise((r) => setTimeout(r, 350));
    expect(screen.getByTestId("privacy").textContent).toBe("hybrid");
    expect(screen.getByText(/Hybrid chosen/)).toBeInTheDocument();
  });
  it("disables Write report over the limit", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "x".repeat(4001) } });
    expect(screen.getByRole("button", { name: /Write report/ })).toBeDisabled();
    expect(screen.getByText(/Shorten to 4,000/)).toBeInTheDocument();
  });
});
