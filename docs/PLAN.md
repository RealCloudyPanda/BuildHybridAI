# Implementation plan: Repro Offline

> Implemented status (2026-11-21): all notes use the same conservative deterministic pipeline; examples are input helpers. Source evidence review, source-change/stale-run protection, downloadable Markdown, simulated routing policies and a versioned production shell cache are implemented. Production root-origin offline reload and export are browser-verified after an online install. Subpath hosting is unsupported. Unit tests use simulated SDK services; real Firebase, Nano and cloud inference remain owner verification. Historical tasks below describe the original plan.

Follow the tasks **in order**. One task = one commit, with the given message. Read [SPEC.md](SPEC.md) first (it is the source of truth for copy, data shapes, fixtures and visuals). Check API facts in [RESEARCH.md](RESEARCH.md). Use the terms in [GLOSSARY.md](../GLOSSARY.md) for names in code and UI copy.

## Ground rules (every task)

- Work only inside this repo. Quote paths (they contain spaces).
- Before every commit run `npm run typecheck && npm test` (from task 1 on). Both must pass. Never use `--no-verify`.
- Conventional commit messages exactly as listed. **No** `Co-Authored-By`, no "Generated with…", no AI attribution in commits. Do not change git identity. **Do not push.**
- No env vars, no `.env`, no secrets in code. Config comes only from the Settings drawer at runtime (ADR 0003).
- Before any UI task (11 onward) read these design references and apply them:
  `REFS/pbakaus_impeccable/.github/skills/impeccable/SKILL.md` (and its `reference/craft-floor.md`), `REFS/emilkowalski_skills/skills/emil-design-eng/SKILL.md`, `REFS/jakubkrehel_skills/skills/better-ui/SKILL.md`, `REFS/jakubkrehel_skills/skills/better-interface/SKILL.md`.
  `REFS` = `/private/tmp/claude-501/-Users-shmy-Downloads-Coding-Journey-Nov-Hackathons/6c7e88a0-eae9-4558-ace9-ae604e08910a/scratchpad/refs`. If REFS is gone, follow SPEC §8.
- If a non-core step fails after two honest attempts, skip it, add a line to `README.md` → "Known limitations", and move on.
- Live Firebase calls can't be tested without the owner's project. Unit-test the engine with `firebase/ai` mocked. Never claim a live run happened unless you saw it.

---

## Phase A: Riskiest integration first (Firebase AI Logic hybrid)

### Task 1: Scaffold
**Commit:** `chore: scaffold Vite React TypeScript app with Vitest`
**Files:** `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts` (or a `test` block in vite config), `index.html`, `src/main.tsx`, `src/App.tsx` (renders "Repro Offline"), `src/vite-env.d.ts`, `tests/smoke.test.ts`.
- `npm create vite@latest` is not allowed to overwrite LICENSE/README. Create the files by hand or scaffold in the scratchpad and copy them over.
- deps: `react@^19`, `react-dom@^19`, `firebase@^13.4.0`, `idb-keyval@^6`, `@fontsource/ibm-plex-sans@^5`, `@fontsource/ibm-plex-mono@^5`.
- devDeps: `vite@^7` (or the current major), `@vitejs/plugin-react`, `typescript@^5`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `fake-indexeddb`, `@types/react`, `@types/react-dom`.
- scripts: `dev` (`vite --port 5173`), `build` (`tsc -b && vite build`), `preview` (`vite preview --port 4173`), `test` (`vitest run`), `typecheck` (`tsc -b --noEmit` or `tsc --noEmit -p .`).
- `strict: true` in tsconfig.

**Acceptance:** `npm install && npm run typecheck && npm test && npm run build` all succeed, and `dist/index.html` exists. `grep '"firebase"' package.json` shows `^13.4.0`.

### Task 2: Report model and parser
**Commit:** `feat(domain): add report schema, types and tolerant parser`
**Files:** `src/domain/report.ts`, `tests/report.test.ts`.
- Export `REPORT_SCHEMA`, `Report`, `Field`, `MissingField`, `emptyReport()`, `parseReport(text)`, `ReportParseError` exactly as SPEC §5.1, §5.2 and §5.6. Export the other shared types from §5.2 (`Privacy`, `Source`, `Availability`, `RunResult`, `Answer`, `Flag`, `Draft`, `Settings`) from `src/domain/types.ts`.

**Acceptance:** tests cover: clean JSON, fenced JSON, JSON with prose around it, missing arrays, unknown `missing_info.field` → `"other"`, more than 4 questions capped, garbage → `ReportParseError`. `npm test` green.

### Task 3: Prompt builder
**Commit:** `feat(domain): build single-turn prompt with clarifications and confirmed fields`
**Files:** `src/domain/prompt.ts`, `tests/prompt.test.ts`.
- `buildPrompt({ notes, answers, report, locked })` returns the exact template in SPEC §5.3, leaving out empty sections. `estimateTokens(s) = Math.ceil(s.length / 4)`. `NOTES_CHAR_LIMIT = 4000`.

**Acceptance:** snapshot test of the full prompt for E1 with one answer and one locked field. A test that the prompt for 4,000-char notes estimates to under 4096 tokens. A test that empty sections are left out.

### Task 4: Settings and Firebase init with App Check
**Commit:** `feat(engine): runtime Firebase config and App Check initialisation`
**Files:** `src/store/settings.ts`, `src/engine/firebase.ts`, `tests/settings.test.ts`.
- `loadSettings()` / `saveSettings()` / `clearSettings()` using localStorage key `repro-offline:settings:v1`.
- `parseFirebaseConfig(input: string)`: accept JSON, or a JS object literal (regex `(\w+)\s*:\s*["']([^"']+)["']`). Require `apiKey`, `projectId`, `appId`. Return `{ ok: true, config } | { ok: false, error }` with readable errors ("Missing appId").
- `initFirebase(settings)`: memoised once per page. If there's no config, return `null`. Otherwise: if `appCheckDebugToken` is set, assign `self.FIREBASE_APPCHECK_DEBUG_TOKEN = token` **before** `initializeAppCheck`. Then `initializeApp(config)`, then `initializeAppCheck(app, { provider: siteKey ? new ReCaptchaEnterpriseProvider(siteKey) : new CustomProvider({ getToken: () => Promise.reject(new Error("No App Check site key. Add a debug token or site key in Settings.")) }), isTokenAutoRefreshEnabled: true })`, then `getAI(app, { backend: new GoogleAIBackend() })`. Return `{ app, ai }`. See RESEARCH "App Check".

**Acceptance:** tests for `parseFirebaseConfig` (JSON, JS literal pasted from the console with `const firebaseConfig = {…};`, missing key) and for settings round-trip in jsdom. `initFirebase` is unit-tested with `vi.mock("firebase/app")`, `vi.mock("firebase/app-check")` and `vi.mock("firebase/ai")`: the debug token is set before `initializeAppCheck` is called (check call order), and it is called once even when invoked twice.

### Task 5: Hybrid runner
**Commit:** `feat(engine): run reports through Firebase AI Logic hybrid inference`
**Files:** `src/engine/availability.ts`, `src/engine/hybrid.ts`, `src/engine/errors.ts`, `tests/hybrid.test.ts`.
- `availability.ts`: `DEVICE_OPTIONS = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] }`. `readAvailability(): Promise<Availability>` uses `globalThis.LanguageModel?.availability(DEVICE_OPTIONS)` and returns `"unsupported"` if the API is missing or throws.
- `hybrid.ts`:
  ```ts
  const CLOUD_MODEL = "gemini-3.5-flash-lite";
  export function modelFor(ai: AI, privacy: Privacy): GenerativeModel // cached per privacy
    getGenerativeModel(ai, {
      mode: privacy === "local-only" ? InferenceMode.ONLY_ON_DEVICE : InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: { model: CLOUD_MODEL, generationConfig: { responseMimeType: "application/json", responseSchema: REPORT_SCHEMA as unknown as SchemaRequest, temperature: 0.2 } },
      onDeviceParams: { createOptions: DEVICE_OPTIONS, promptOptions: { responseConstraint: REPORT_SCHEMA } },
    });
  export async function runHybrid(ai, prompt, privacy): Promise<{ text: string; source: "on_device" | "in_cloud"; availabilityBefore: Availability }>
  ```
  Order inside `runHybrid`: (1) `availabilityBefore = await readAvailability()`. (2) If `local-only` and availability is `unavailable`/`unsupported`, throw `EngineError("device-unavailable")` **without calling the SDK**. (3) If `!navigator.onLine` and `hybrid` and availability ≠ `available`, throw `EngineError("offline-no-device")`. (4) `const r = await modelFor(...).generateContent(prompt)`. (5) `source = r.response.inferenceSource ?? "in_cloud"`. (6) **Invariant:** if `local-only` and `source !== "on_device"`, throw `EngineError("privacy-violation")` and discard the text (should never happen; guards ADR 0002). (7) Return `{ text: r.response.text(), source, availabilityBefore }`.
  - `prepareDeviceModel(ai, onProgress)` calls `modelFor(ai, "hybrid").initializeDeviceModel(onProgress)`. It must only be called from a click handler.
- `errors.ts`: `EngineError` with `code` ∈ `device-unavailable | offline-no-device | privacy-violation | app-check | network | schema | parse | unknown`. `toEngineError(e)` maps `AIError.code`: `api-not-enabled`/`unsupported` → `device-unavailable`; `fetch-error` → `network`; `invalid-schema` → `schema`; `parse-failed` → `parse`; any message containing "App Check" or "403" → `app-check`. Add `userMessage(code)` with copy from SPEC §3 (error card).
- If `responseSchema` with the plain object fails typecheck, use `responseJsonSchema: REPORT_SCHEMA` instead (RESEARCH "Structured output"). Note which one you used in a code comment.

**Acceptance:** with `vi.mock("firebase/ai")` (fake `getGenerativeModel` capturing params, fake `generateContent`), tests prove: (a) hybrid → `mode: "prefer_on_device"`, local-only → `"only_on_device"`; (b) the same schema object reaches `responseSchema`/`responseJsonSchema` and `responseConstraint`; (c) `inferenceSource` is passed through; (d) local-only + `unsupported` throws `device-unavailable` and `generateContent` is **never called**; (e) local-only + an `in_cloud` response throws `privacy-violation`; (f) the AIError mapping works. `npm test` green.

### Task 6: Sample engine and run orchestration
**Commit:** `feat(engine): deterministic sample engine with example fixtures`
**Files:** `src/fixtures/examples.ts`, `src/engine/sample.ts`, `src/engine/run.ts`, `tests/sample.test.ts`, `tests/run.test.ts`.
- `examples.ts`: the three examples (id, chip label, notes) and the fixtures E1, E2, E2b, E3 and the E2 example answers, **copied character for character from SPEC §6.1**.
- `sample.ts`: `runSample({ notes, answers, exampleId, locked, report })` follows SPEC §6.1 (fixture lookup, E2b rule) and §6.2 (rule engine). Pure and synchronous; the 650 ms delay goes in `run.ts`.
- `run.ts`: `runEngine(input, privacy, settings): Promise<RunResult>`. No firebase → sample (after `await delay(650)`). Otherwise `runHybrid` → `parseReport` (retry once on `ReportParseError`). Time it with `performance.now()`.
- Locked fields: after either engine, call `mergeLocked(report, previousReport, locked)` from `src/domain/merge.ts` (create it here, with a test).

**Acceptance:** tests: E1/E2/E3 notes return their fixtures exactly. E2 with 4 answers → E2b. Arbitrary notes ("opened settings, changed language to French, saved, page still in English. expected French. firefox") → steps ≥ 2, actual contains "still in English", expected "French", environment ["Firefox"], a version question present. Locked `expected` survives a run. `runEngine` with no config never imports or calls the mocked firebase module.

### Task 7: Sensitivity scan
**Commit:** `feat(domain): scan notes for internal URLs, emails and tokens`
**Files:** `src/domain/sensitivity.ts`, `tests/sensitivity.test.ts`.
- `scanSensitive(text)` → matches with `kind`, `text`, `start`, `end`, following SPEC §5.4. `summarise(matches)` → "Found an internal URL, an email and a token."

**Acceptance:** E3 notes give email + internal-host + jwt. E1 notes give none. `https://example.com` gives none. `http://localhost:3000/x` and `10.0.0.12` match. A 40-character random hex string matches. An ordinary 32+ character word without digits does not.

### Task 8: Invention check
**Commit:** `feat(domain): flag report details that are not in the source text`
**Files:** `src/domain/invention.ts`, `tests/invention.test.ts`.
- `inventionCheck(report, sourceText, acceptedFlags)` → `Flag[]`, following SPEC §5.5. Export `sourceTextFor(draft)`.

**Acceptance:** all fixtures E1, E2, E2b, E3 give **zero** flags against their own source text (this is a required test). Adding `"Chrome 131"` to E1's environment flags `131` (version). Replacing "Chrome on Mac" with "Safari on Mac" flags `Safari`. "macOS" is not flagged when the notes say "mac". An accepted flag is skipped.

---

## Phase B: The product UI

### Task 9: Drafts store
**Commit:** `feat(store): persist drafts in IndexedDB with autosave hook`
**Files:** `src/store/drafts.ts`, `src/store/useDrafts.ts`, `tests/drafts.test.ts` (uses `import "fake-indexeddb/auto"`).
- `listDrafts()`, `getDraft(id)`, `saveDraft(d)`, `deleteDraft(id)`, `newDraft(example?)`, using `idb-keyval` with keys `draft:<id>`. `useDrafts()` holds the list and the active id, and saves changes after a 400 ms debounce. Sorted by `updatedAt` desc.

**Acceptance:** tests for CRUD and sort order. The hook test (Testing Library `renderHook`) shows the debounce saves once for rapid edits.

### Task 10: Design tokens and app shell
**Commit:** `style: add design tokens, self-hosted fonts and three-column shell`
**Files:** `src/styles/tokens.css`, `src/styles/app.css`, `src/components/Header.tsx`, `src/components/Shell.tsx`, `src/App.tsx`, `public/favicon.svg`.
- Tokens exactly as SPEC §8 (colours, type scale, radii, shadows, `--ease-out`). Import the `@fontsource` weights in `main.tsx`.
- Header: wordmark (Plex Mono 500, "repro" in ink and "offline" in ink-2), mode chip, on-device chip placeholder, "Demo shop ↗" link (`/demo-shop/`, `target="_blank" rel="noopener"`), Settings icon button with `aria-label`.
- Grid layout and breakpoints from SPEC §3. The favicon is a simple SVG mark (a ticket corner with a check), with no third-party logos.

**Acceptance:** `npm run dev`. A headless Chrome screenshot at 1440×900 and 375×812 (command in README task) shows the three regions with no overflow. Contrast of `--ink-2` on `--paper` ≥ 4.5:1 (compute it and note it in a CSS comment).

### Task 11: Notes pane
**Commit:** `feat(ui): notes pane with examples, counter, privacy switch and sensitive banner`
**Files:** `src/components/NotesPane.tsx`, `src/components/PrivacySwitch.tsx`, `src/components/SensitiveBanner.tsx`, `src/components/HighlightedTextarea.tsx`, `tests/NotesPane.test.tsx`.
- Mono textarea with a mirror highlight layer behind it that underlines sensitive spans. The counter is `n / 4000` and turns amber over the limit. Three example chips appear only when notes are empty. They create the notes and set `exampleId` (editing the notes later clears `exampleId` only if the text changes).
- Privacy segmented control (`role="radiogroup"`) with Hybrid / Local-only and a one-line description under it.
- Auto Local-only per SPEC F4, with the `privacyOverride` behaviour.
- "Write report" primary button with a `⌘↵` hint (`Ctrl+Enter` on non-Mac). Disabled when empty or over the limit.

**Acceptance:** component tests: clicking the E3 chip sets privacy to local-only and shows the banner text "Found an internal URL, an email and a token." Switching back to Hybrid sticks after further typing. Over-limit text disables the button.

### Task 12: Report pane, source badge and run wiring
**Commit:** `feat(ui): editable report with gaps, locks and inference source badge`
**Files:** `src/components/ReportPane.tsx`, `src/components/SourceBadge.tsx`, `src/components/EditableField.tsx`, `src/components/StepsEditor.tsx`, `src/components/ErrorCard.tsx`, `src/App.tsx`, `tests/ReportPane.test.tsx`.
- Empty, running (elapsed seconds ticking, "Writing on this device…" / "…in the cloud…" / "…with the sample engine…"; for hybrid show "on this device or in the cloud" until the result is known), report, and error states.
- Title input. Steps as a numbered list (mono numerals) with add, remove, move up/down buttons. Expected and actual textareas. Environment as editable chips. Empty fields render as a **gap** ("Needs info", dashed amber).
- Editing locks the field (lock toggle button with `aria-pressed`).
- `SourceBadge`: On device (green), In cloud (blue), Sample · no AI (hatched grey) + `ms` + the why-cloud reason from SPEC §3 (in a tooltip/popover, and in the Engine panel).
- Wire "Write report" → `runEngine` → save to the draft (`report`, `lastRun`).

**Acceptance:** in Sample mode in the browser: E1 chip → Write report → the fixture renders with the Sample badge. Edit expected → lock shown → Write report again → expected unchanged. Component test covers the gap rendering for E2.

### Task 13: Missing-info questions and re-run
**Commit:** `feat(ui): answer missing-info questions and re-run the report`
**Files:** `src/components/MissingInfo.tsx`, `src/App.tsx`, `tests/MissingInfo.test.tsx`.
- Each question has a labelled answer input. "Update report" is enabled when ≥1 answer is filled. Answers are saved to `draft.answers`, then a run. "Answered" is a collapsible list. "Fill example answers" link (Sample mode + `exampleId === "vague"` only).

**Acceptance:** in the browser: E2 → 4 questions → Fill example answers → Update report → the E2b fixture, with environment "Firefox on Windows laptop". Test asserts the answers appear in the next `buildPrompt` output (spy on `buildPrompt` or test the composed input).

### Task 14: Invention flags UI
**Commit:** `feat(ui): show invention-check flags with remove and keep actions`
**Files:** `src/components/FlagMark.tsx`, `src/components/InventionSummary.tsx`, `src/components/ReportPane.tsx`, `tests/FlagMark.test.tsx`.
- Wrap flagged substrings in fields with an amber dotted underline. A popover (keyboard accessible, Escape closes, focus returns) says "Not in your notes" with Remove / Keep. Summary line under the badge.
- Sample mode only: a "Simulate a made-up detail" text button (SPEC §6.1) that adds "Chrome 131" to the environment and shows a flag.

**Acceptance:** test: Remove deletes the environment chip. Keep adds it to `acceptedFlags`, and the flag disappears and stays gone after a re-check.

### Task 15: Drafts rail
**Commit:** `feat(ui): drafts rail with autosave, new draft and delete confirm`
**Files:** `src/components/DraftsRail.tsx`, `src/App.tsx`.
- New draft button, a list (title or first notes line, relative time via `Intl.RelativeTimeFormat`, source dot colour), the active item marked with `aria-current`. Inline delete confirm. A drawer under 1100 px (`overscroll-behavior: contain`, focus trap, Escape closes).

**Acceptance:** in the browser: create 2 drafts, reload, both are still there with their reports. Delete one, reload, it's gone.

### Task 16: Engine panel and Settings drawer
**Commit:** `feat(ui): engine status panel with prepare download and settings drawer`
**Files:** `src/components/EnginePanel.tsx`, `src/components/SettingsDrawer.tsx`, `src/components/Header.tsx`.
- Engine panel (popover from the header on-device chip): availability (refreshed on open and every 2 s while downloading), **Prepare on-device model** button → `prepareDeviceModel` with a progress bar (`role="progressbar"`, `aria-valuenow`), Chrome setup steps when unsupported (SPEC F5), the privacy → SDK mode mapping ("Hybrid = PREFER_ON_DEVICE", "Local-only = ONLY_ON_DEVICE, never uses the cloud"), and last run details. In Sample mode: "Add a Firebase config in Settings to use Gemini Nano on this device."
- Settings drawer per SPEC F9. Save validates with `parseFirebaseConfig`, saves, then `location.reload()`. Remove config clears and reloads. Show the debug token field as `type="password"` with a show toggle.

**Acceptance:** in the browser: paste an invalid config → inline error "Missing appId". Paste a valid-shaped fake config → reload → header shows "Live" and the Engine panel shows availability (in headless Playwright Chromium: "Not supported"). Remove config → back to Sample mode. **If the owner's real config and a Nano-capable Chrome are available**, run E1 in Hybrid and Local-only and confirm the badge says On device. Otherwise add "Live inference verified only with mocked SDK tests" to Known limitations.

### Task 17: Export
**Commit:** `feat(ui): copy report as Markdown or plain text with sensitive-detail guard`
**Files:** `src/domain/markdown.ts`, `src/components/ExportBar.tsx`, `src/components/Toast.tsx`, `tests/markdown.test.ts`.
- Markdown format: `## {title}`, `**Steps to reproduce**` numbered, `**Expected**`, `**Actual**`, `**Environment**` bullets, `**Open questions**` bullets (unanswered missing_info), a footer line `_Written with Repro Offline (source: On device)_`. Plain text: the same without markup.
- If `scanSensitive(markdown)` finds anything, confirm first (SPEC F8). Clipboard via `navigator.clipboard.writeText`, with a toast.

**Acceptance:** snapshot test of the E1 Markdown output. In the browser: copying E3 asks for confirmation first.

### Task 18: Demo shop with planted bugs
**Commit:** `feat(demo): add Trailhead Supply demo shop with planted navigation bugs`
**Files:** `public/demo-shop/index.html`, `public/demo-shop/shop.css`, `public/demo-shop/shop.js`.
- Follow SPEC §7 exactly (12 products, 4 categories, in-stock toggle in `sessionStorage`, hash routes, both planted bugs with `// BUG(planted):` comments). Its own look: a sans system font stack, a forest-green accent, CSS-drawn product placeholders (no external images or logos).

**Acceptance:** in the browser at `/demo-shop/`: Tents → Ridgeline 2P → Back shows All (bug A). Turn on In stock only, scroll to Cookware → Trail Kettle → Back: the toggle is still on and the page is at the top (bug B). The E1 fixture steps reproduce bug A literally.

### Task 19: Offline app shell
**Commit:** `feat(pwa): cache the app shell for offline use`
**Files:** `vite.config.ts`, `package.json` (`vite-plugin-pwa` devDep), `src/main.tsx`, `public/icons/icon-192.png`, `public/icons/icon-512.png` (render the favicon SVG to PNG with headless Chrome or `sharp` in the scratchpad; commit only the PNGs), `src/components/OfflineChip.tsx`.
- `VitePWA({ registerType: "autoUpdate", workbox: { globPatterns: ["**/*.{js,css,html,svg,png,woff2}"], navigateFallback: "/index.html", navigateFallbackDenylist: [/^\/demo-shop/] }, manifest: { name: "Repro Offline", short_name: "Repro", theme_color: <paper hex>, background_color: <paper hex>, display: "standalone", icons: [...] } })`.
- Offline chip in the header when `navigator.onLine === false`: "Offline · on-device and sample runs still work".

**Acceptance:** `npm run build && npm run preview`. In Playwright (or Chrome DevTools): load once, go offline (`context.setOffline(true)`), reload → the app renders, and a Sample-mode run works. Note the result in the README. If the plugin breaks the build, remove it and add a Known limitations line.

### Task 20: Polish pass
**Commit:** `style: polish motion, focus states, responsive layout and accessibility`
**Files:** `src/styles/app.css`, components as needed.
- Apply SPEC §8 motion (staggered field reveal ≤240 ms total, button press scale, badge cross-fade) with `prefers-reduced-motion: reduce` turning it off. Hover styles inside `@media (hover: hover)`. Visible focus rings. Every icon button has an `aria-label`. `aria-live="polite"` on the report region and the toasts. Check 375 / 768 / 1440 widths.
- Run an Impeccable-style critique (shape → critique → polish → audit) on the three main states (empty, E1 report, E3 local-only) and fix what you find. Remove anything that looks generic: centred blocks, needless borders, placeholder copy.

**Acceptance:** add `@axe-core/playwright` (devDep) and run it in task 21. Zero serious or critical violations on the main page in Sample mode with the E1 report showing. Screenshots at 375 and 1440 show no overflow or clipped text.

### Task 21: End-to-end smoke test
**Commit:** `test: add Playwright smoke test for the sample-mode flow`
**Files:** `playwright.config.ts`, `e2e/smoke.spec.ts`, `package.json` (`e2e` script, `@playwright/test` devDep).
- `webServer: { command: "npm run dev", port: 5173 }`. Steps: E1 chip → Write report → "Category filter resets to All" visible and "Sample" badge. New draft → E2 → 4 questions → Fill example answers → Update report → "Scroll position is lost". New draft → E3 → Local-only checked and banner visible. axe check on the E1 state. Run chromium only.

**Acceptance:** `npx playwright test` passes locally (Chromium is cached; if not, `npx playwright install chromium`).

---

## Phase C: Ship

### Task 22: Firebase Hosting config
**Commit:** `chore: add Firebase Hosting config for static deploy`
**Files:** `firebase.json` (hosting `public: "dist"`, SPA rewrite `** → /index.html` **except** `/demo-shop/**`, and `Cache-Control: no-cache` for `sw.js`). Do **not** add `.firebaserc` (project id is the owner's).

**Acceptance:** `npm run build` and `firebase.json` is valid JSON. The README task documents `npx firebase-tools deploy --only hosting --project <id>`.

### Task 23: README with screenshots
**Commit:** `docs: write full README with screenshots and judging guide`
**Files:** `README.md`, `docs/images/*.png`.
- Capture at least 5 PNGs with headless Chrome or Playwright against `npm run dev` (start it in the background and kill it afterwards):
  `hero.png` (E1 report with badge, 1440×900), `questions.png` (E2 gaps + questions), `local-only.png` (E3 banner + Local-only), `flag.png` (simulated invention flag popover), `demo-shop.png`, `mobile.png` (375×812).
  Example: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --screenshot="docs/images/demo-shop.png" http://localhost:5173/demo-shop/`. For stateful screens (clicking chips, filling answers), write a short Playwright script in the scratchpad (not committed) that drives the dev server and calls `page.screenshot`.
- Sections (in this order): title + one-line pitch, hero screenshot, The problem, What it does, The demo moment, How it works (Mermaid diagram from SPEC §4), Firebase AI Logic hybrid & why it is necessary (mode table, the inferenceSource badge, the systemInstruction finding, App Check), Quickstart (`npm install`, `npm run dev`, open `http://localhost:5173`), Sample mode vs Live mode (step-by-step Firebase setup: create a project, add a web app, enable AI Logic with the Gemini Developer API, App Check with a debug token or reCAPTCHA Enterprise, Chrome flag, Prepare), Judging criteria → proof (SPEC §9 table), Project structure, Testing (`npm test`, `npm run e2e`, with the counts you actually got), Known limitations (honest: live runs verified or not; Chrome desktop 139+ only; 4,000-char notes cap; offline result), How this was built (AI-assisted development disclosure: Claude Code was used to plan and write the code; the human owner reviewed and directed it), License.

**Acceptance:** every image link resolves (`ls docs/images`). No invented metrics or quotes. Test counts match real output.

### Task 24: Final requirements sweep
**Commit:** `chore: final requirements check and cleanup`
**Files:** whatever needs fixing.
- Run: `npm run typecheck && npm test && npm run build && npx playwright test`.
- `git grep -nE "AIza[0-9A-Za-z_-]{20,}"` returns nothing. No `.env` files. LICENSE is present.
- `git grep -n "firebase/ai"` shows the runtime import in `src/engine/hybrid.ts` and `src/engine/firebase.ts`.
- Tick the SPEC §12 items you can tick. Leave the owner items (video, Devpost, hosting, Firebase project) as an explicit "Owner TODO" list at the end of the README.

**Acceptance:** all commands green. `git status` clean. `git log --oneline | wc -l` shows about 30 commits. Do not push.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Plain JSON schema rejected by the cloud `responseSchema` typing/validation | Switch to `responseJsonSchema` (Task 5). Covered by a mocked test. Note it in README if switched. |
| Nano ignores `responseConstraint` or returns partial JSON | `parseReport` coercion + one retry (Task 6). Error card copy. |
| Nano invents details anyway | Invention check (Task 8, 14). It's part of the pitch. |
| `PREFER_ON_DEVICE` silently goes to the cloud on fresh browsers | Prepare button + why-cloud reason (Tasks 12, 16). |
| No live Firebase project during build | Sample mode + mocked SDK tests. Owner verifies before recording (README Owner TODO). |
| App Check debug token appears in console during recording | README and video setup note: keep DevTools closed. |
| vite-plugin-pwa friction | Optional. Drop it and document (Task 19). |
