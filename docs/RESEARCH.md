# Research notes: Firebase AI Logic hybrid inference (web)

Checked on 2026-11-20. Everything marked **Verified** was read from the installed package source or type definitions (scratch install outside this repo), not from memory.

## Package versions

| Package | Version | How checked |
|---|---|---|
| `firebase` | **13.4.0** (latest) | `npm view firebase version` |
| `@firebase/ai` (bundled) | 3.1.0 | `node_modules/@firebase/ai/package.json` |

The hackathon needs `firebase >= 12.5.0` for `inferenceSource`. Use `"firebase": "^13.4.0"`.

## Verified API surface (`firebase/ai`)

```ts
import {
  getAI, getGenerativeModel, GoogleAIBackend,
  InferenceMode, InferenceSource, AIError, AIErrorCode, Schema,
  type GenerativeModel, type HybridParams,
} from "firebase/ai";

// InferenceMode values (string constants)
InferenceMode.PREFER_ON_DEVICE // "prefer_on_device"
InferenceMode.ONLY_ON_DEVICE   // "only_on_device"
InferenceMode.PREFER_IN_CLOUD  // "prefer_in_cloud"
InferenceMode.ONLY_IN_CLOUD    // "only_in_cloud"

// InferenceSource values
InferenceSource.ON_DEVICE // "on_device"
InferenceSource.IN_CLOUD  // "in_cloud"

interface HybridParams {
  mode: InferenceMode;
  onDeviceParams?: { createOptions?: LanguageModelCreateOptions; promptOptions?: { responseConstraint?: object } };
  inCloudParams?: ModelParams; // { model, generationConfig, systemInstruction, ... }
}

// on the response object:
result.response.inferenceSource // "on_device" | "in_cloud"
result.response.text()

// on the model:
model.initializeDeviceModel(onDownloadProgress?: (p: number) => void): Promise<void>
```

- **Default cloud model** when `inCloudParams` is omitted: `const DEFAULT_HYBRID_IN_CLOUD_MODEL = 'gemini-3.5-flash-lite'` (SDK source). We pass it explicitly.
- **Backends:** `GoogleAIBackend` (Gemini Developer API, has a no-cost tier) and `AgentPlatformBackend` (renamed from Vertex AI). Use `GoogleAIBackend`.
- **`getAI(app, { backend, useLimitedUseAppCheckTokens? })`**. `AIModel` throws `NO_API_KEY` / `NO_PROJECT_ID` / `NO_APP_ID` if the Firebase config is incomplete, even for on-device-only use. Without a config the app must use Sample mode.
- **Error codes** (`AIErrorCode`): `error`, `request-error`, `response-error`, `fetch-error`, `api-not-enabled`, `invalid-schema`, `no-api-key`, `no-app-id`, `no-model`, `no-project-id`, `parse-failed`, `unsupported`, and others.

## How the SDK picks a source (verified in `callCloudOrDevice`)

| Mode | Behaviour |
|---|---|
| `ONLY_ON_DEVICE` | If Chrome `LanguageModel` is `unavailable`, throws `AIError(API_NOT_ENABLED)`. If `downloadable`/`downloading`, **waits for the download** and then runs on device. Never calls the cloud: if it can't run locally it throws `AIError(UNSUPPORTED, 'Inference mode is ONLY_ON_DEVICE, but an on-device model is not available.')`. |
| `PREFER_ON_DEVICE` | Runs on device **only if availability is exactly `available`** and the request is compatible. Otherwise it goes to the cloud. It does **not** wait for a download. |
| `PREFER_IN_CLOUD` | Tries the cloud and falls back to the device on certain errors (e.g. fetch errors) if the device is available. |
| `ONLY_IN_CLOUD` | Cloud only. |

Consequences for us:
1. In hybrid mode the user must click **Prepare on-device model** (`initializeDeviceModel`) before the first run. Otherwise a fresh browser silently goes to the cloud. The SDK docs say this call **must follow a user gesture** if it starts a download.
2. Before each run we read `LanguageModel.availability()` ourselves (for display only) so the badge can explain *why* a hybrid run went to the cloud.

## Gotchas found in the source

- **`systemInstruction` is dropped on device.** `GenerativeModel.generateContent` passes `systemInstruction` in the request, but `ChromeAdapterImpl.generateContent` only maps `request.contents` to Prompt API messages. On device, the model never sees the system instruction. **Decision:** put the full instructions in the single user prompt (ADR 0001). (An alternative is `onDeviceParams.createOptions.initialPrompts: [{ role: "system", ... }]`, but then the two sources get different prompts.)
- **`generationConfig` (temperature etc.) is ignored on device.** Only `promptOptions.responseConstraint` reaches Chrome.
- **Single turn only on device.** Every on-device `generateContent` creates a new session (`createSession()` destroys the old one). This matches our "re-run with answers" design.
- `countTokens` throws for `ONLY_ON_DEVICE`. Estimate tokens ourselves (chars / 4).
- With `mode` set, any top-level `ModelParams` keys are **ignored with a warning**. Everything goes in `inCloudParams` / `onDeviceParams`.

## Structured output (both sources)

Docs: https://firebase.google.com/docs/ai-logic/hybrid/web/generate-structured-output

```ts
const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: {
    model: "gemini-3.5-flash-lite",
    generationConfig: { responseMimeType: "application/json", responseSchema: REPORT_SCHEMA },
  },
  onDeviceParams: {
    createOptions: {
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    },
    promptOptions: { responseConstraint: REPORT_SCHEMA },
  },
});
const result = await model.generateContent(prompt);
const report = JSON.parse(result.response.text());
const source = result.response.inferenceSource; // "on_device" | "in_cloud"
```

The docs show one plain JSON schema object passed to **both** `responseSchema` and `responseConstraint`. Fallback if the cloud rejects the schema (`invalid-schema`): `responseJsonSchema` (also in `GenerationConfig` 13.4.0; it needs `responseMimeType: "application/json"` and no `responseSchema`).

## Chrome setup for on-device (docs)

https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- Chrome **139+** desktop.
- `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` → **Enabled**, then restart.
- In DevTools: `await LanguageModel.availability()` returns `available` / `downloadable` / `downloading` / `unavailable`. `await LanguageModel.create({ monitor(m){ m.addEventListener("downloadprogress", e => console.log(e.loaded)) } })` starts the download.
- The download takes several minutes.
- Limits (docs): no multimodal input on device. **Requests over 4096 tokens are not supported** (about 3,000 English words). Chrome's own input quota may be higher, but we design for 4096. No built-in tools. AI monitoring does not show on-device calls.

## App Check (verified in `@firebase/app-check` source)

```ts
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } from "firebase/app-check";

// Must be set BEFORE initializeAppCheck. It is read once per page load.
(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugTokenOrTrue;

const app = initializeApp(config);
initializeAppCheck(app, {
  provider: siteKey
    ? new ReCaptchaEnterpriseProvider(siteKey)
    : new CustomProvider({ getToken: () => Promise.reject(new Error("No App Check site key; use a debug token")) }),
  isTokenAutoRefreshEnabled: true,
});
```

- `initializeDebugMode` runs **once per page**. In debug mode `getToken` exchanges the debug token and **skips the provider**. So a `CustomProvider` placeholder plus a debug token works on localhost. **Changing settings needs a page reload.**
- In debug mode the SDK prints the debug token to the console. Keep DevTools closed when recording the demo video.
- App Check is only used for **cloud** requests. On-device inference sends no network request. (The source shows no token fetch on the on-device path. Confirm offline behaviour by hand: see PLAN task 18.)
- Console steps: Firebase console → App Check → Apps → Manage debug tokens → add token. Enable "Firebase AI Logic" and choose the Gemini Developer API.

## Reusable examples found on GitHub

| Link | What's useful |
|---|---|
| https://github.com/firebase/firebase-js-sdk/blob/main/packages/ai/src/methods/chrome-adapter.ts | Ground truth for on-device behaviour (sessions, availability, systemInstruction gap). |
| https://github.com/firebase/firebase-js-sdk/blob/main/packages/ai/src/requests/hybrid-helpers.ts | Mode → source dispatch. |
| https://github.com/firebase/firebase-js-sdk/blob/main/docs-devsite/ai.generativemodel.md | `initializeDeviceModel` docs. |
| https://github.com/davolu/wysend/blob/HEAD/src/lib/firebase/ai.ts | Real app: `ONLY_ON_DEVICE` for raw text, `initialPrompts` system role, plain JSON schema as `responseConstraint`. Same privacy reasoning as ours. |
| https://github.com/oguirado/TaskLight/blob/HEAD/src/ai/firebase.ts | `initializeDeviceModel` usage in a web app. |
| https://github.com/firebase/quickstart-android (firebase-ai/feature/hybrid) | Android hybrid samples. Only useful for UX ideas. |

Other #BuildHybridAI entries we saw (`GaiaSG94/buildhybridai-signal-guard`, `ALENZACODES/stub-check`) do privacy redaction and pay-stub checks. None does bug reports or "ask instead of invent". Our idea is still unclaimed as far as this search could tell.

## Other libraries chosen

- `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `typescript`: smallest React static stack.
- `idb-keyval`: tiny IndexedDB key/value store for drafts.
- `vite-plugin-pwa`: generates a service worker that caches the app shell for offline use. Optional: if it causes trouble, drop it and record that in Known limitations.
- `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`: self-hosted fonts, so the UI still looks right offline.
- `vitest`, `jsdom`, `@testing-library/react`: unit and component tests. `@playwright/test` for one smoke test (Chromium is cached on this machine).
