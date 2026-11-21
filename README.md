# Repro Offline

**Rough QA notes in, reproducible bug report out. It runs on your device, and it asks before it guesses.**

Built for the Firebase **#BuildHybridAI** hackathon (2026), targeting *Best Web/Chrome App*. It uses **Firebase AI Logic hybrid inference**: Gemini Nano in Chrome, with Gemini in the cloud as an optional fallback.

![Repro Offline turning the "Filter resets after Back" notes into a report, with the source badge and invention check](docs/images/hero.png)

> The screenshots show **Sample mode** (no Firebase config, so no AI). Every report in them comes from the deterministic sample engine and is labelled `Sample · no AI`.

## The problem

A manual QA tester scribbles *"picked Tents, opened the Ridgeline tent, hit back, filter gone"* while testing. Later they have to turn that into a ticket another developer can reproduce. Two things go wrong:

1. **Missing details.** The ticket bounces back with "which browser?", "what did you expect?". General AI writers fill those gaps with confident guesses like "Chrome 120 on Windows 11", which is worse than leaving them blank.
2. **Internal details.** Rough notes contain staging URLs, test-account emails and session tokens, and testers are told not to paste those into cloud chatbots.

## What it does

- **Notes → structured report**: title, steps, expected, actual, environment. Every field is editable, and an edited field is **locked** so later runs keep it.
- **Asks instead of inventing.** Anything the notes don't say becomes a dashed **Needs info** gap plus a missing-info question. Answer the questions, press **Update report**, and it re-runs.
- **Invention check.** A deterministic check flags any version, browser, OS, device, URL, number or quote in the report that isn't in your notes or answers. You can **Remove** or **Keep** each flag.
- **Privacy routing.** A sensitivity scan finds emails, internal hosts, IPs and tokens in the notes and switches the draft to **Local-only** (`ONLY_ON_DEVICE`), which never falls back to the cloud.
- **Source badge.** Each report says where it actually ran (`On device`, `In cloud` or `Sample · no AI`), read from the SDK's `response.inferenceSource`. If a Hybrid run went to the cloud, it explains why.
- **Source evidence and handoff review** labels literal source matches, tester-confirmed fields and details needing review. Notes changed after a run trigger a stale-report warning. A simulated routing lab explains local-only, offline and cloud policies without making model calls.
- **Drafts** autosave to IndexedDB. **Copy as Markdown / text / Download Markdown** asks for confirmation first if the report still contains internal details.
- **Trailhead Supply**: a small demo shop at `/demo-shop/index.html` with two planted bugs to write reports about.

| Vague notes become questions, not guesses | Sensitive notes switch to Local-only |
|---|---|
| ![Vague notes: gaps and four missing-info questions](docs/images/questions.png) | ![Notes with an internal URL, an email and a token: Local-only on](docs/images/local-only.png) |

| Invention check flag | Engine panel (privacy setting → SDK mode) |
|---|---|
| ![A simulated "Chrome 131" flagged as not in your notes](docs/images/flag.png) | ![Engine panel showing the Hybrid and Local-only mode mapping](docs/images/engine.png) |

| Demo shop with planted bugs | Mobile (375 px) |
|---|---|
| ![Trailhead Supply demo shop](docs/images/demo-shop.png) | ![Report on a phone-sized screen](docs/images/mobile.png) |

## The demo moment

Paste vague notes ("back button on the shop is weird again, lost my place") and you get a report that is **mostly gaps plus four specific questions**, not a confident fake. Answer them and the report fills in with only what you said. Then paste notes containing a staging URL, an email and a session token: the app underlines them, switches to **Local-only** on its own, and Firebase AI Logic runs in `ONLY_ON_DEVICE` mode. If Gemini Nano isn't available it stops with an error. It never uploads.

## How it works

```mermaid
flowchart TD
  N[Notes pane] --> S[Sensitivity scan] --> P{Privacy setting}
  N --> B["buildPrompt(notes, answers, locked fields)"]
  B --> R{runEngine}
  R -- no Firebase config --> SE["Sample engine (rules + fixtures, no AI)"]
  R -- config --> FB["Firebase AI Logic getGenerativeModel(ai, { mode, inCloudParams, onDeviceParams })"]
  P -- Hybrid --> FB
  P -- Local-only --> FB
  FB -- PREFER_ON_DEVICE --> H["Gemini Nano in Chrome, or gemini-3.5-flash-lite in the cloud (App Check)"]
  FB -- ONLY_ON_DEVICE --> L["Gemini Nano only, error if unavailable"]
  H --> PR[parseReport → mergeLocked → inventionCheck]
  L --> PR
  SE --> PR
  PR --> UI["Report pane + inferenceSource badge"] --> DB[(IndexedDB draft)]
```

## Firebase AI Logic hybrid, and why it is necessary

The product promise ("your notes don't leave this device") only works if the model can run locally, and the experience only works on more machines if there is a cloud fallback for the notes that *are* safe to send. That is exactly what hybrid inference provides.

| Privacy setting | SDK mode | Behaviour |
|---|---|---|
| Hybrid | `InferenceMode.PREFER_ON_DEVICE` | Gemini Nano when Chrome reports it `available`, otherwise `gemini-3.5-flash-lite` in the cloud. |
| Local-only | `InferenceMode.ONLY_ON_DEVICE` | Gemini Nano only. Unavailable → visible error, **no cloud call** ([ADR 0002](docs/adr/0002-local-only-never-falls-back.md)). |

What the code does (see [`src/engine/hybrid.ts`](src/engine/hybrid.ts), [`src/engine/firebase.ts`](src/engine/firebase.ts)):

- `import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai"` and calls `generateContent` at runtime in Live mode (`firebase@^13.4.0`).
- **One JSON schema for both sources**: `inCloudParams.generationConfig.responseJsonSchema` for the cloud and `onDeviceParams.promptOptions.responseConstraint` for Chrome's Prompt API.
- **`response.inferenceSource`** drives the source badge. Before each run the app reads `LanguageModel.availability()` so it can explain a cloud run ("On-device model not downloaded yet. Press Prepare.").
- **Prepare on-device model** calls `model.initializeDeviceModel(onProgress)` from a click and shows a progress bar. `PREFER_ON_DEVICE` doesn't wait for a download, so without this step a fresh browser silently uses the cloud.
- **A finding we designed around:** the SDK's on-device path drops `systemInstruction` and `generationConfig`, so all instructions go into one self-contained prompt that both models receive ([ADR 0001](docs/adr/0001-instructions-inline-in-single-prompt.md), [RESEARCH](docs/RESEARCH.md)).
- **App Check** is initialised before any AI call: reCAPTCHA Enterprise if you give a site key, otherwise a debug token for localhost.
- A defensive invariant: if a Local-only run ever reports `in_cloud`, the result is discarded and an error is shown.

## Quickstart

Node 24.12+ for the Firebase SDK dependencies.

```bash
npm install
npm run dev
# open http://localhost:5173
```

The app opens in **Sample mode**. Click one of the three example chips, then **Write report**. The demo shop is at http://localhost:5173/demo-shop/index.html.

Other commands: `npm test` (unit, component and integration tests), `npm run typecheck`, `npm run build` (static build in `dist/`), `npm run preview` (serves the build on port 4173). For the browser smoke test, run `npx playwright install chromium` once, then `npm run e2e`. To verify production offline behavior, run `npm run build` followed by `npm run e2e -- --config playwright.production.config.ts`.

## Sample mode vs Live mode

| | Sample mode | Live mode |
|---|---|---|
| When | No Firebase config (default) | A Firebase web config pasted into **Settings** |
| Header | `Sample mode: no AI` (hatched chip) | `Live` |
| Reports | One deterministic extraction and clarification pipeline for all notes, including the examples. **No AI.** | Firebase AI Logic hybrid inference |
| Badge | `Sample · no AI` | `On device` or `In cloud` (from `inferenceSource`) |
| Extras | "Fill example answers" and "Simulate a made-up detail" for the demo | Prepare on-device model, why-cloud reasons |

Sample mode never loads the Firebase SDK (it is imported on demand only in the live path).

### Setting up Live mode

1. Create a Firebase project, then add a **Web app** and copy its `firebaseConfig`.
2. In the console, open **AI Logic**, get started, and choose the **Gemini Developer API**.
3. **App Check**: register the web app. For localhost, open *Manage debug tokens*, add a token, and paste the same token into Settings. For a hosted URL, register its domain for a reCAPTCHA Enterprise site key, register that key in Firebase App Check, and use the key in Settings. Keep debug tokens out of the repo, video and submission. [Firebase App Check setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
4. In the app, open **Settings** (top right), paste the config (JSON or the `const firebaseConfig = {…}` snippet) and the token or key, then **Save and reload**. Everything is stored only in this browser's localStorage.
5. For on-device runs use desktop **Chrome 139+**, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart Chrome, then open the **On-device** chip in the header and press **Prepare on-device model**. The download takes several minutes.

In debug mode the App Check SDK prints the debug token to the console, so keep DevTools closed when recording.

Deploy (owner): `npm run build && npx firebase-tools deploy --only hosting --project <your-project-id>` ([`firebase.json`](firebase.json) is included; no `.firebaserc` is committed).

## Judging criteria: where to find the proof

| Criterion | Proof | Where |
|---|---|---|
| Technological implementation | `getGenerativeModel` with `PREFER_ON_DEVICE` / `ONLY_ON_DEVICE`, one schema for `responseJsonSchema` + `responseConstraint`, `initializeDeviceModel` with progress, `inferenceSource` badge, why-cloud reason, App Check, mocked SDK tests | [`src/engine/hybrid.ts`](src/engine/hybrid.ts), [`src/engine/firebase.ts`](src/engine/firebase.ts), [`src/engine/availability.ts`](src/engine/availability.ts), [`tests/hybrid.test.ts`](tests/hybrid.test.ts) |
| Hybrid used meaningfully | Sensitivity scan forces `ONLY_ON_DEVICE`, which never falls back; Hybrid uses the cloud only when Nano isn't ready; the systemInstruction gap is designed around | [`src/domain/sensitivity.ts`](src/domain/sensitivity.ts), [docs/adr/](docs/adr/) |
| Design | Drafts, autosave, edit + lock, export, settings, empty/running/error states, ⌘/Ctrl+Enter, responsive layout, axe check | Screenshots above, [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts) |
| Potential impact | A real hand-off (QA → developer) and a real constraint (internal data in notes) | [The problem](#the-problem) |
| Quality of idea | "Asks instead of invents", plus a deterministic invention check and a demo shop with planted bugs | [`src/domain/invention.ts`](src/domain/invention.ts), [`public/demo-shop/shop.js`](public/demo-shop/shop.js) |
| Requirements | `firebase` `^13.4.0`, runtime `firebase/ai` calls, App Check, MIT license | [`package.json`](package.json), [LICENSE](LICENSE) |

## Project structure

```
index.html                 app entry
public/demo-shop/          Trailhead Supply, the shop with planted bugs (plain HTML/CSS/JS)
src/domain/                report schema + parser, prompt, sensitivity scan, invention check, merge, markdown
src/engine/                firebase.ts (App + App Check + AI), hybrid.ts (Firebase AI Logic), availability.ts,
                           sample.ts (rule engine), run.ts (chooses Sample vs Live), errors.ts
src/store/                 settings (localStorage), drafts (IndexedDB via idb-keyval), useDrafts hook
src/fixtures/examples.ts   the three example notes and their fixtures
src/components/            React UI
tests/                     Vitest unit and component tests (firebase/ai mocked)
e2e/smoke.spec.ts          Playwright smoke test + axe accessibility check
docs/                      SPEC, PLAN, RESEARCH, GRILL (design interview), ADRs, screenshots
```

## Testing

- `npm test`: 84 passing tests across 21 files, covering the general pipeline, literal evidence, routing, stale async results, IndexedDB storage and the SDK path with simulated services.
- `npm run e2e`: two browser tests pass (shop bugs plus Sample examples and axe); the production-only test is skipped here. The production config passes its separate offline reload, saved-draft, cache ownership and Markdown-download test.

## Known limitations

- **Live inference still needs a check with a real Firebase project.** Automated tests exercise the SDK with simulated services. A successful cloud run requires AI Logic and App Check, and a successful on-device run also requires desktop Chrome with Gemini Nano.
- On-device runs need desktop Chrome 139+ with the Prompt API flag. Other browsers can use Hybrid (cloud) or Sample mode only.
- Notes are capped at 4,000 characters to stay within the ~4096-token on-device limit.
- **Production offline shell:** after the first successful online load and worker installation, the root-hosted build reloads offline, restores IndexedDB drafts and downloads Markdown. The development server does not install the worker. Fresh installs require network; live model downloads and cloud inference require their own connectivity. Subpath hosting is not supported.
- The sample engine uses conservative deterministic rules for every input. It can miss meaning, leaves unknowns open and labels literal source evidence separately from tester confirmation. It makes no model-quality claim.
- In the dev server the demo shop lives at `/demo-shop/index.html` (`/demo-shop/` is caught by the app's SPA fallback).
- Changing Settings reloads the page, because App Check debug mode is read once per page load.

## Owner TODO

- [ ] Create the Firebase project, enable AI Logic (Gemini Developer API) and App Check, add a debug token.
- [ ] Run E1 in Hybrid and Local-only in Nano-capable Chrome and confirm the badge says **On device**.
- [ ] Run Hybrid with the on-device model unavailable and confirm a successful report with the **In cloud** badge and App Check enabled.
- [ ] Give judges a working Live demo and testing instructions using a dedicated Firebase project. Confirm the MIT-licensed repo is public and keep judging access free through Dec 16, 2026, 5 pm ET.
- [ ] Upload the ≤3 min demo as a public YouTube video (see the [video script](docs/SPEC.md#10-video-script-250-target-300-hard-cap)) and submit on Devpost before **Nov 30, 2026, 5 pm ET**. [Official contest rules](https://firebasehybridaihackathon.devpost.com/rules)

## How this was built

This project was planned and written with AI coding assistants (Claude Code): the product spec, design interview ([docs/GRILL.md](docs/GRILL.md)), ADRs and the code itself. The human owner set the direction and reviewed the result. API facts about Firebase AI Logic were checked against the installed SDK source and are recorded in [docs/RESEARCH.md](docs/RESEARCH.md).

## License

[MIT](LICENSE)
