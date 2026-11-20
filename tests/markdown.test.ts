import { toMarkdown, toPlainText } from "../src/domain/markdown";
import { FIXTURES } from "../src/fixtures/examples";

describe("export", () => {
  it("formats E1 as Markdown", () => {
    expect(toMarkdown(FIXTURES["filter-reset"], "on_device")).toMatchSnapshot();
  });
  it("formats plain text without markup", () => {
    const t = toPlainText(FIXTURES["filter-reset"], "sample");
    expect(t).not.toMatch(/\*\*|##/);
    expect(t).toContain("Environment: Chrome on Mac");
  });
});
