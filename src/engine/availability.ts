import type { Availability } from "../domain/types";

export const DEVICE_OPTIONS = {
  expectedInputs: [{ type: "text" as const, languages: ["en"] }],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
};

interface LanguageModelGlobal {
  availability(options?: unknown): Promise<string>;
}

/** Reads Chrome's Prompt API availability for display and routing. "unsupported" if the API is missing. */
export async function readAvailability(): Promise<Availability> {
  const lm = (globalThis as unknown as { LanguageModel?: LanguageModelGlobal }).LanguageModel;
  if (!lm || typeof lm.availability !== "function") return "unsupported";
  try {
    const a = await lm.availability(DEVICE_OPTIONS);
    if (a === "available" || a === "downloadable" || a === "downloading" || a === "unavailable") return a;
    return "unavailable";
  } catch {
    return "unsupported";
  }
}
