import "fake-indexeddb/auto";
import { deleteApp, getApps } from "firebase/app";
import { runEngine } from "../src/engine/run";
import { resetFirebaseForTests } from "../src/engine/firebase";
import { REPORT_SCHEMA } from "../src/domain/report";

afterEach(async () => {
  await Promise.all(getApps().map(deleteApp));
  resetFirebaseForTests();
  vi.unstubAllGlobals();
});

it("uses the installed Firebase SDK to exchange App Check and generate a cloud report", async () => {
  const notes = "Clicked Back and the filter reset.";
  const output = { title: "Filter resets after Back" };
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes("appcheck.googleapis.com") && url.endsWith(":exchangeDebugToken?key=test-key")) {
      expect(JSON.parse(String(init.body))).toEqual({ debug_token: "test-debug-token" });
      return Response.json({ token: "test-app-check-token", ttl: "3600s" });
    }
    expect(url).toMatch(/^https:\/\/firebasevertexai\.googleapis\.com\/.*\/models\/gemini-3\.5-flash-lite:generateContent/);
    expect(new Headers(init.headers).get("X-Firebase-AppCheck")).toBe("test-app-check-token");
    expect(JSON.parse(String(init.body))).toMatchObject({
      contents: [{ role: "user", parts: [{ text: expect.stringContaining(notes) }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: REPORT_SCHEMA },
    });
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] });
  });
  vi.stubGlobal("LanguageModel", undefined);
  vi.stubGlobal("FIREBASE_APPCHECK_DEBUG_TOKEN", undefined);
  vi.stubGlobal("fetch", fetch);

  const result = await runEngine({ notes, answers: [], locked: [], report: null }, "hybrid", {
    firebaseConfig: { apiKey: "test-key", projectId: "test-project", appId: "test-app" },
    appCheckDebugToken: "test-debug-token",
    recaptchaSiteKey: "",
  });

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(result).toMatchObject({ source: "in_cloud", availabilityBefore: "unsupported", report: output });
});
