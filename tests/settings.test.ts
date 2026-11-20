import { parseFirebaseConfig, loadSettings, saveSettings, clearSettings } from "../src/store/settings";

const calls: string[] = [];
vi.mock("firebase/app", () => ({ initializeApp: vi.fn(() => { calls.push("initializeApp"); return { name: "app" }; }) }));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: vi.fn(() => {
    calls.push("initializeAppCheck:" + (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN);
  }),
  ReCaptchaEnterpriseProvider: class {},
  CustomProvider: class { constructor(public o: unknown) {} },
}));
vi.mock("firebase/ai", () => ({
  getAI: vi.fn(() => { calls.push("getAI"); return { ai: true }; }),
  GoogleAIBackend: class {},
}));

describe("parseFirebaseConfig", () => {
  it("accepts JSON", () => {
    const r = parseFirebaseConfig('{"apiKey":"k","projectId":"p","appId":"a"}');
    expect(r).toEqual({ ok: true, config: { apiKey: "k", projectId: "p", appId: "a" } });
  });
  it("accepts the JS literal from the console", () => {
    const r = parseFirebaseConfig(`const firebaseConfig = {
  apiKey: "k1",
  authDomain: 'demo.firebaseapp.com',
  projectId: "demo",
  appId: "1:2:web:3"
};`);
    expect(r.ok && r.config.authDomain).toBe("demo.firebaseapp.com");
    expect(r.ok && r.config.appId).toBe("1:2:web:3");
  });
  it("reports a missing key", () => {
    expect(parseFirebaseConfig('{ apiKey: "k", projectId: "p" }')).toEqual({ ok: false, error: "Missing appId" });
  });
});

describe("settings storage", () => {
  it("round-trips through localStorage", () => {
    clearSettings();
    expect(loadSettings().firebaseConfig).toBeNull();
    saveSettings({ firebaseConfig: { apiKey: "k", projectId: "p", appId: "a" }, recaptchaSiteKey: "", appCheckDebugToken: "t" });
    expect(loadSettings().appCheckDebugToken).toBe("t");
    clearSettings();
    expect(loadSettings().appCheckDebugToken).toBe("");
  });
});

describe("initFirebase", () => {
  it("sets the debug token before App Check and initialises once", async () => {
    const { initFirebase, resetFirebaseForTests } = await import("../src/engine/firebase");
    resetFirebaseForTests();
    const s = { firebaseConfig: { apiKey: "k", projectId: "p", appId: "a" }, recaptchaSiteKey: "", appCheckDebugToken: "dbg" };
    const a = initFirebase(s);
    const b = initFirebase(s);
    expect(a).toBe(b);
    expect(calls).toEqual(["initializeApp", "initializeAppCheck:dbg", "getAI"]);
  });
  it("returns null without a config", async () => {
    const { initFirebase, resetFirebaseForTests } = await import("../src/engine/firebase");
    resetFirebaseForTests();
    expect(initFirebase({ firebaseConfig: null, recaptchaSiteKey: "", appCheckDebugToken: "" })).toBeNull();
  });
});
