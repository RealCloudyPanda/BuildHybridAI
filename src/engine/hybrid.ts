import { getGenerativeModel, InferenceMode, type AI, type GenerativeModel } from "firebase/ai";
import { REPORT_SCHEMA } from "../domain/report";
import type { Availability, Privacy } from "../domain/types";
import { DEVICE_OPTIONS, readAvailability } from "./availability";
import { EngineError, toEngineError } from "./errors";

export const CLOUD_MODEL = "gemini-3.5-flash-lite";

const models = new WeakMap<AI, Map<Privacy, GenerativeModel>>();

/**
 * One GenerativeModel per privacy setting. The same JSON schema goes to the cloud
 * (responseJsonSchema) and to Chrome (responseConstraint).
 * We use responseJsonSchema (not responseSchema) because REPORT_SCHEMA is a plain JSON
 * Schema object, which is what responseJsonSchema is typed for in firebase 13.4.
 */
export function modelFor(ai: AI, privacy: Privacy): GenerativeModel {
  let byPrivacy = models.get(ai);
  if (!byPrivacy) models.set(ai, (byPrivacy = new Map()));
  let m = byPrivacy.get(privacy);
  if (!m) {
    m = getGenerativeModel(ai, {
      mode: privacy === "local-only" ? InferenceMode.ONLY_ON_DEVICE : InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: {
        model: CLOUD_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: REPORT_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0.2,
        },
      },
      onDeviceParams: {
        createOptions: DEVICE_OPTIONS,
        promptOptions: { responseConstraint: REPORT_SCHEMA },
      },
    });
    byPrivacy.set(privacy, m);
  }
  return m;
}

export interface HybridResult {
  text: string;
  source: "on_device" | "in_cloud";
  availabilityBefore: Availability;
}

export async function runHybrid(ai: AI, prompt: string, privacy: Privacy): Promise<HybridResult> {
  const availabilityBefore = await readAvailability();
  if (privacy === "local-only" && (availabilityBefore === "unavailable" || availabilityBefore === "unsupported")) {
    throw new EngineError("device-unavailable");
  }
  if (privacy === "hybrid" && typeof navigator !== "undefined" && !navigator.onLine && availabilityBefore !== "available") {
    throw new EngineError("offline-no-device");
  }
  let r;
  try {
    r = await modelFor(ai, privacy).generateContent(prompt);
  } catch (e) {
    throw toEngineError(e);
  }
  const source = (r.response.inferenceSource ?? "in_cloud") as HybridResult["source"];
  // Invariant (ADR 0002): Local-only output must never come from the cloud.
  if (privacy === "local-only" && source !== "on_device") throw new EngineError("privacy-violation");
  return { text: r.response.text(), source, availabilityBefore };
}

/** Starts the on-device model download. Call only from a click handler (user gesture). */
export async function prepareDeviceModel(ai: AI, onProgress: (p: number) => void): Promise<void> {
  await modelFor(ai, "hybrid").initializeDeviceModel(onProgress);
}
