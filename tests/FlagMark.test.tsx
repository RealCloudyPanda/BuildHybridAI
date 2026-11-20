import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { FlaggedText } from "../src/components/FlagMark";
import { inventionCheck } from "../src/domain/invention";
import { EXAMPLES, FIXTURES } from "../src/fixtures/examples";
import type { Flag } from "../src/domain/types";

function Harness() {
  const [env, setEnv] = useState(["Chrome on Mac", "Chrome 131"]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const flags = inventionCheck({ ...FIXTURES["filter-reset"], environment: env }, EXAMPLES[0].notes, accepted);
  return (
    <ul>
      {env.map((e, i) => {
        const fs = flags.filter((f) => f.field === "environment" && f.index === i);
        return (
          <li key={e} data-testid="chip">
            {fs.length ? (
              <FlaggedText
                text={e}
                flags={fs}
                onRemove={(f: Flag) => setEnv((xs) => xs.filter((_, j) => j !== f.index))}
                onKeep={(f: Flag) => setAccepted((a) => [...a, f.text.toLowerCase()])}
              />
            ) : e}
          </li>
        );
      })}
      <output data-testid="count">{flags.length}</output>
    </ul>
  );
}

describe("FlagMark", () => {
  it("Remove deletes the environment chip", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "131: not in your notes" }));
    expect(screen.getByRole("dialog", { name: "Not in your notes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getAllByTestId("chip")).toHaveLength(1);
    expect(screen.getByTestId("count").textContent).toBe("0");
  });
  it("Keep accepts the flag so it stays gone", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "131: not in your notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(screen.getAllByTestId("chip")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /not in your notes/ })).toBeNull();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });
  it("Escape closes the popover and returns focus", () => {
    render(<Harness />);
    const b = screen.getByRole("button", { name: "131: not in your notes" });
    fireEvent.click(b);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(b).toHaveFocus();
  });
});
