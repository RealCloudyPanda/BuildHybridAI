import { REPORT_SCHEMA } from "../src/domain/report";
import { toEngineError, EngineError } from "../src/engine/errors";

const captured: any[] = [];
const generateContent = vi.fn();
vi.mock("firebase/ai", () => ({
  InferenceMode: { PREFER_ON_DEVICE: "prefer_on_device", ONLY_ON_DEVICE: "only_on_device" },
  getGenerativeModel: vi.fn((_ai: unknown, params: unknown) => {
    captured.push(params);
    return { generateContent, initializeDeviceModel: vi.fn() };
  }),
}));

const { runHybrid, modelFor } = await import("../src/engine/hybrid");
const setLM = (a: string | null) => {
  (globalThis as any).LanguageModel = a === null ? undefined : { availability: async () => a };
};
const reply = (source: string | undefined) => ({ response: { inferenceSource: source, text: () => '{"title":"t"}' } });

beforeEach(() => {
  generateContent.mockReset();
});

describe("modelFor", () => {
  it("maps privacy to SDK inference modes and shares one schema", () => {
    const ai = {} as any;
    modelFor(ai, "hybrid");
    modelFor(ai, "local-only");
    modelFor(ai, "hybrid");
    expect(captured).toHaveLength(2);
    expect(captured[0].mode).toBe("prefer_on_device");
    expect(captured[1].mode).toBe("only_on_device");
    expect(captured[0].inCloudParams.generationConfig.responseJsonSchema).toBe(REPORT_SCHEMA);
    expect(captured[0].onDeviceParams.promptOptions.responseConstraint).toBe(REPORT_SCHEMA);
    expect(captured[0].inCloudParams.model).toBe("gemini-3.5-flash-lite");
  });
});

describe("runHybrid", () => {
  it("passes inferenceSource through", async () => {
    setLM("available");
    generateContent.mockResolvedValue(reply("on_device"));
    const r = await runHybrid({} as any, "p", "hybrid");
    expect(r).toEqual({ text: '{"title":"t"}', source: "on_device", availabilityBefore: "available" });
  });
  it("defaults a missing source to in_cloud", async () => {
    setLM("downloadable");
    generateContent.mockResolvedValue(reply(undefined));
    expect((await runHybrid({} as any, "p", "hybrid")).source).toBe("in_cloud");
  });
  it("local-only + unsupported fails without calling the SDK", async () => {
    setLM(null);
    await expect(runHybrid({} as any, "p", "local-only")).rejects.toMatchObject({ code: "device-unavailable" });
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("local-only discards an in_cloud response", async () => {
    setLM("available");
    generateContent.mockResolvedValue(reply("in_cloud"));
    await expect(runHybrid({} as any, "p", "local-only")).rejects.toMatchObject({ code: "privacy-violation" });
  });
  it("maps SDK errors", async () => {
    setLM("available");
    generateContent.mockRejectedValue({ code: "AI/fetch-error", message: "boom" });
    await expect(runHybrid({} as any, "p", "hybrid")).rejects.toMatchObject({ code: "network" });
  });
});

describe("toEngineError", () => {
  it.each([
    [{ code: "api-not-enabled" }, "device-unavailable"],
    [{ code: "unsupported" }, "device-unavailable"],
    [{ code: "invalid-schema" }, "schema"],
    [{ code: "parse-failed" }, "parse"],
    [{ code: "fetch-error", message: "App Check token invalid" }, "app-check"],
    [{ message: "HTTP 403" }, "app-check"],
    [new Error("x"), "unknown"],
  ])("%o -> %s", (e, code) => {
    expect(toEngineError(e).code).toBe(code);
  });
  it("keeps EngineErrors", () => {
    const e = new EngineError("parse");
    expect(toEngineError(e)).toBe(e);
  });
});
