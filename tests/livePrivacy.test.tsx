import "fake-indexeddb/auto";
import { clear } from "idb-keyval";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../src/App";
import { saveSettings } from "../src/store/settings";
import { runEngine } from "../src/engine/run";
import { EngineError } from "../src/engine/errors";
import { EXAMPLES, FIXTURES } from "../src/fixtures/examples";

vi.mock("../src/engine/run", () => ({ runEngine: vi.fn() }));

beforeEach(async () => {
  await clear();
  vi.mocked(runEngine).mockReset().mockResolvedValue({
    report: FIXTURES.vague, source: "on_device", ms: 1, availabilityBefore: "available",
  });
  saveSettings({
    firebaseConfig: { apiKey: "test-key", projectId: "test-project", appId: "test-app" },
    recaptchaSiteKey: "", appCheckDebugToken: "",
  });
});

afterEach(() => localStorage.clear());

it("routes a sensitive paste straight to Local-only when submitted before the scan settles", async () => {
  render(<App />);
  const notes = await screen.findByLabelText("Notes", { selector: "textarea" });
  fireEvent.change(notes, { target: { value: EXAMPLES[2].notes } });
  fireEvent.keyDown(notes, { key: "Enter", ctrlKey: true });
  expect(runEngine).toHaveBeenCalledWith(expect.objectContaining({ notes: EXAMPLES[2].notes }), "local-only", expect.anything());
  expect(await screen.findByText(/On device ·/)).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Local-only" })).toHaveAttribute("aria-checked", "true");
});

it("routes a sensitive clarification to Local-only even with ordinary notes", async () => {
  render(<App />);
  const notes = await screen.findByLabelText("Notes", { selector: "textarea" });
  fireEvent.change(notes, { target: { value: EXAMPLES[1].notes } });
  fireEvent.click(screen.getByRole("button", { name: /Write report/ }));
  const answer = await screen.findByRole("textbox", { name: /Which browser and device/ });
  fireEvent.change(answer, { target: { value: "Chrome, signed in as qa@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Update report" }));
  expect(vi.mocked(runEngine).mock.calls.map(([, privacy]) => privacy)).toEqual(["hybrid", "local-only"]);
  expect(await screen.findByText(/On device ·/)).toBeInTheDocument();
});

it("keeps the Report tab selected when the first run fails", async () => {
  vi.mocked(runEngine).mockRejectedValueOnce(new EngineError("device-unavailable"));
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Notes with internal details" }));
  fireEvent.click(screen.getByRole("button", { name: /Write report/ }));
  const alert = await screen.findByRole("alert");
  expect(alert.closest(".shell")).toHaveAttribute("data-tab", "report");
  expect(screen.getByRole("tab", { name: "Report" })).toHaveAttribute("aria-selected", "true");
});

it("retries an update with the clarification that was submitted before the failure", async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Vague notes" }));
  fireEvent.click(screen.getByRole("button", { name: /Write report/ }));
  const answer = await screen.findByRole("textbox", { name: /Which browser and device/ });
  vi.mocked(runEngine).mockRejectedValueOnce(new EngineError("network"));
  fireEvent.change(answer, { target: { value: "Chrome on Mac" } });
  fireEvent.click(screen.getByRole("button", { name: "Update report" }));
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(runEngine).toHaveBeenCalledTimes(3);
  expect(vi.mocked(runEngine).mock.calls[2][0].answers).toEqual(vi.mocked(runEngine).mock.calls[1][0].answers);
  expect(await screen.findByText(/On device ·/)).toBeInTheDocument();
});
