import { describe, expect, it } from "vitest";
import { acceptFlag, editField, removeFlagged, toggleLock } from "../src/domain/edits";
import { emptyReport } from "../src/domain/report";

describe("report edits", () => {
  it("removes a flagged detail from a step and tidies spacing", () => {
    const report = { ...emptyReport(), steps: ["Open Chrome 131 , then go back"] };
    const next = removeFlagged(report, { field: "steps", index: 0, text: "Chrome 131", kind: "version" });
    expect(next.steps[0]).toBe("Open, then go back");
  });

  it("drops a flagged environment entry by index", () => {
    const report = { ...emptyReport(), environment: ["Mac", "Chrome 131"] };
    expect(removeFlagged(report, { field: "environment", index: 1, text: "Chrome 131", kind: "browser" }).environment).toEqual(["Mac"]);
  });

  it("accepts flags case-insensitively without duplicates", () => {
    expect(acceptFlag(["chrome 131"], { field: "title", text: "Chrome 131", kind: "version" })).toEqual(["chrome 131"]);
  });

  it("locks an edited field and toggles locks", () => {
    const { report, locked } = editField(null, [], "title", "New title");
    expect(report.title).toBe("New title");
    expect(locked).toEqual(["title"]);
    expect(toggleLock(locked, "title")).toEqual([]);
  });
});
