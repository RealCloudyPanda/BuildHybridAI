# Repro Offline: product spec

> Implemented status (2026-11-21): all notes use the same conservative deterministic pipeline; examples are input helpers. Source evidence review, source-change/stale-run protection, downloadable Markdown, simulated routing policies and a versioned production shell cache are implemented. Production root and `/repro/` subpath offline reload and export are browser-verified after an online install. The Run module owns per-draft snapshots, complete-prompt privacy routing, stale-result acceptance and async cleanup. Unit tests use simulated SDK services; real Firebase, Nano and cloud inference remain owner verification. Historical tasks below describe the original plan.

> Rough QA notes in, reproducible bug report out. On your device. It asks before it guesses.

Hackathon: Firebase #BuildHybridAI 2026 (deadline **Nov 30 2026, 5 pm ET**). Target: **Best Web/Chrome App**. Stretch: Grand Prize.
Terms: [GLOSSARY.md](../GLOSSARY.md). Decisions: [GRILL.md](GRILL.md), [adr/](adr/). API facts: [RESEARCH.md](RESEARCH.md).

---

## 1. User and problem

**User:** a manual QA tester (or a developer doing exploratory testing) on a web product team.

**The painful task:** while testing they jot fragments like *"picked Tents, opened the Ridgeline tent, hit back, filter gone"*. Later they have to turn that into a ticket another developer can reproduce. Two things go wrong:
1. **Missing details.** The developer bounces the ticket back with "which browser?", "what did you expect?", "every time?". General-purpose AI writers paper over these gaps with plausible guesses ("Chrome 120 on Windows 11"), which is worse than leaving them out.
2. **Internal details.** Rough notes contain staging URLs, test-account emails and session tokens. Testers are told not to paste these into cloud chatbots.

**Promise:** Repro Offline writes the report **on the tester's own device** with Gemini Nano through Firebase AI Logic. It **asks missing-info questions instead of inventing details** and **shows where every run happened**.

---

## 2. Core flows

### F1: Notes to report (Hybrid, happy path)
1. Tester opens the app. Header shows **Live** (config present) or **Sample mode: no AI**.
2. Types or pastes notes into the Notes pane (mono font, counter `n / 4000`).
3. Presses **Write report** (or ⌘/Ctrl+Enter).
4. Report pane shows a running state ("Writing on this device… 3 s").
5. The report appears with a **source badge**: `On device · 4.1 s`, `In cloud · 1.3 s`, or `Sample · no AI`.
6. Gaps show as dashed "Needs info" fields. Missing-info questions are listed under the report.

### F2: Answer questions, then re-run
1. Each missing-info question has an inline answer field.
2. The tester answers one or more and presses **Update report**.
3. The app rebuilds the whole prompt (notes + clarifications + locked fields) and makes **one fresh single-turn call**.
4. Answered questions move to an "Answered" list in the draft. Questions disappear when the model stops asking them.

### F3: Edit and lock
1. Every report field is editable in place.
2. Editing a field **locks** it (small lock icon, `aria-label="Locked: kept on re-run"`). Clicking the lock unlocks it.
3. Locked fields go into the prompt as CONFIRMED FIELDS and are merged back verbatim after the run.

### F4: Sensitive notes → Local-only
1. While the tester types (debounced 300 ms), the sensitivity scan runs on the notes.
2. On the first match in a draft, the privacy setting switches to **Local-only** and a banner appears: *"Found an internal URL and an email. Local-only is on, so these notes won't leave this device."* The matched spans are underlined in a highlight layer (mirror div behind the textarea).
3. The tester can switch back to Hybrid. That override sticks for the draft (`privacyOverride: true`), and the banner changes to "Hybrid chosen. Notes may be sent to the cloud if the on-device model isn't ready."
4. In Local-only, if the on-device model is unavailable, the run fails with an error card ("This browser can't run the on-device model. Set it up, or switch to Hybrid.") and a link that opens the Engine panel. **No cloud call is made** (ADR 0002).

### F5: Prepare the on-device model
1. The Engine panel (from the header chip "On-device: Ready / Needs download / Downloading 42% / Not supported") shows the current availability (`LanguageModel.availability()`; `"Not supported"` if `LanguageModel` is missing).
2. **Prepare on-device model** calls `model.initializeDeviceModel(p => setProgress(p))` inside the click handler and shows a progress bar.
3. When not supported, the panel lists setup steps: Chrome 139+ desktop, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart, come back and press Prepare.

### F6: Invention check
1. After every run (model or sample), the check compares the report with the source text.
2. Each flagged span gets an amber dotted underline and a "Not in your notes" popover with **Remove** (deletes the span, or the whole environment chip) and **Keep** (adds it to the draft's `acceptedFlags` so it isn't flagged again).
3. A summary line under the badge: "Invention check: nothing added" or "Invention check: 2 details not in your notes".

### F7: Drafts
1. Drafts autosave to IndexedDB 400 ms after any change.
2. The left rail lists drafts (title or first notes line, relative time, source dot). **New draft** is at the top.
3. Delete asks for inline confirmation ("Delete draft? This can't be undone." Delete / Cancel).

### F8: Export
**Copy as Markdown** and **Copy as text** buttons. If the report contains a sensitive-scan match, the button first shows a confirm popover: "This report includes an internal URL. Copy anyway?". After copying, a toast says "Copied as Markdown".

### F9: Settings (live mode)
A Settings sheet (right drawer) with:
- **Firebase web config**: textarea. Accepts JSON or the JS object literal from the console (parse by extracting `key: "value"` pairs for `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). Required keys: `apiKey`, `projectId`, `appId`.
- **reCAPTCHA Enterprise site key** (optional).
- **App Check debug token** (optional; for localhost).
- **Save and reload**, **Remove config** (back to Sample mode).
- Explanatory text: "Stored only in this browser (localStorage). Never sent anywhere except Firebase."

### F10: Demo shop
`/demo-shop/` is "Trailhead Supply", a fictional gear shop with 12 products in 4 categories, chip filters, an "In stock only" toggle, and product detail pages via hash routes. It contains two **planted bugs** (§7). The app header links to it ("Demo shop ↗").

---

## 3. Screens and states

Layout (≥1100 px): `[Drafts rail 232px] [Notes pane 1fr] [Report pane 1.15fr]`. Under 1100 px the rail becomes a drawer. Under 760 px Notes and Report stack, and a "Report" tab appears after the first run.

| Screen / region | States |
|---|---|
| Header | wordmark · mode chip (`Live` / `Sample mode: no AI`) · on-device chip (Ready / Needs download / Downloading n% / Not supported / n/a in Sample) · Demo shop link · Settings button |
| Drafts rail | empty ("No drafts yet"), list, active item, delete-confirm |
| Notes pane | empty with 3 example chips ("Filter resets after Back", "Vague notes", "Notes with internal details") · typing · over limit (counter turns amber, button disabled, "Shorten to 4,000 characters for the on-device model") · sensitive banner · privacy segmented control (Hybrid / Local-only) |
| Report pane | empty ("Your report appears here. Nothing is sent anywhere until you press Write report.") · running (spinner + elapsed s + where it's running: "on this device" / "in the cloud" / "with the sample engine") · report · error card (Local-only unavailable / offline + cloud needed / parse failure / App Check or API errors with the AIErrorCode) |
| Missing info card | questions with answer inputs · Update report button (disabled until ≥1 answer) · Answered (collapsible) |
| Engine panel (popover) | availability · Prepare button · progress · setup steps · last run: source, privacy setting, ms, why-cloud reason |
| Settings drawer | empty · filled · validation error · saved (reload) |
| Toasts | copied, saved config, draft deleted |

**Why-cloud reasons** (shown when a Hybrid run returns `in_cloud`), based on the availability read just before the run: `downloadable` → "On-device model not downloaded yet. Press Prepare." · `downloading` → "On-device model still downloading." · `unavailable` / no API → "This browser can't run the on-device model." · `available` → "Chrome declined the on-device request, so it ran in the cloud."

---

## 4. Architecture

The Run module's caller interface is `createRuns(settings, drafts).run(draft, answers?)`.
The UI renders per-draft running/error state and the returned applied/stale/failed/superseded outcome.
The module snapshots source text, rescans the exact prompt before execution, persists submitted answers
for retries, and accepts a result only for the latest run with an unchanged input fingerprint. A draft
switch cannot redirect a result; deleting a draft cannot recreate it. Late completions and errors cannot
clear a newer run's state.

```
Notes pane → Run module (snapshot, prompt privacy, sequence, acceptance, cleanup)
                 ↓
             runEngine → Sample adapter (no config, no Firebase imports)
                 └─────→ Firebase adapter → same inline prompt → Hybrid / Local-only
                 ↓          parse + one parse retry, with unchanged privacy
             locked-field merge + timing
                 ↓
Run module → originating draft update → Report pane, badge, invention check, export
                 ↓
             IndexedDB draft
```

The execution adapters share `runEngine`'s result shape. Sample remains deterministic and requires no
configuration or network. Firebase initialization stays lazy; Local-only still uses ONLY_ON_DEVICE
on both parse attempts. Public-interface Run tests cover privacy, rejected stale results, overlapping
success/error completion, draft switching/deletion and the offline Sample adapter. UI and SDK regressions
remain separate checks; no live model execution is implied.

Source layout (the implementer creates exactly these):
```
index.html                     app entry
public/demo-shop/              planted-bug shop (index.html, shop.css, shop.js)
public/favicon.svg
src/main.tsx, src/App.tsx
src/styles/tokens.css, src/styles/app.css
src/domain/report.ts           types, REPORT_SCHEMA, parseReport, emptyReport
src/domain/prompt.ts           buildPrompt
src/domain/invention.ts        inventionCheck
src/domain/sensitivity.ts      scanSensitive
src/domain/markdown.ts         toMarkdown, toPlainText
src/domain/merge.ts            mergeLocked
src/engine/firebase.ts         initFirebase(settings): { ai } | null  (App + App Check, once per page)
src/engine/hybrid.ts           runHybrid(prompt, privacy): RunResult
src/engine/availability.ts     readAvailability(), prepareDeviceModel(onProgress)
src/engine/sample.ts           runSample(input): RunResult
src/engine/run.ts              Sample/Firebase execution adapters, parse retry, timing, locked merge
src/engine/runs.ts             createRuns(): complete per-draft run lifecycle
src/store/drafts.ts            IndexedDB CRUD
src/store/settings.ts          localStorage settings + parseFirebaseConfig
src/fixtures/examples.ts       the 3 example notes + sample fixtures
src/components/*.tsx           UI
tests/*.test.ts(x), e2e/smoke.spec.ts
```

---

## 5. Data shapes

### 5.1 Report JSON schema (sent to both sources, see RESEARCH)

```ts
export const REPORT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    expected: { type: "string" },
    actual: { type: "string" },
    environment: { type: "array", items: { type: "string" } },
    missing_info: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: ["steps", "expected", "actual", "environment", "frequency", "other"] },
          question: { type: "string" },
        },
        required: ["field", "question"],
      },
    },
  },
  required: ["title", "steps", "expected", "actual", "environment", "missing_info"],
} as const;
```

### 5.2 TypeScript types

```ts
type Field = "title" | "steps" | "expected" | "actual" | "environment";
type MissingField = "steps" | "expected" | "actual" | "environment" | "frequency" | "other";

interface Report {
  title: string;
  steps: string[];
  expected: string;
  actual: string;
  environment: string[];
  missing_info: { field: MissingField; question: string }[];
}

type Privacy = "hybrid" | "local-only";
type Source = "on_device" | "in_cloud" | "sample";
type Availability = "available" | "downloadable" | "downloading" | "unavailable" | "unsupported";

interface RunResult {
  report: Report;
  source: Source;
  ms: number;
  availabilityBefore: Availability | null; // null in Sample mode
  rawText?: string;                         // kept for debugging, not shown
}

interface Answer { question: string; field: MissingField; answer: string; answeredAt: number }

interface Flag { field: Field; index?: number; text: string; kind: "version" | "browser" | "os" | "device" | "url" | "number" | "quoted" }

interface Draft {
  id: string;               // crypto.randomUUID()
  createdAt: number; updatedAt: number;
  exampleId?: "filter-reset" | "vague" | "sensitive";
  notes: string;
  privacy: Privacy;
  privacyOverride: boolean; // user chose Hybrid after a sensitive match
  answers: Answer[];
  report: Report | null;
  locked: Field[];
  acceptedFlags: string[];  // lowercased texts the user chose to Keep
  lastRun: Omit<RunResult, "report" | "rawText"> & { at: number; privacy: Privacy } | null;
}

interface Settings {
  firebaseConfig: { apiKey: string; projectId: string; appId: string; authDomain?: string; storageBucket?: string; messagingSenderId?: string } | null;
  recaptchaSiteKey: string;
  appCheckDebugToken: string;
}
```

localStorage key: `repro-offline:settings:v1`. IndexedDB: `idb-keyval` default store with keys `draft:<id>`.

### 5.3 Prompt template (`buildPrompt`)

Exact text. Sections are omitted when empty. Keep it under ~600 tokens without notes.

```
You turn a software tester's rough notes into a bug report that another developer can follow to reproduce the bug.

RULES
1. Use ONLY facts stated in NOTES, CLARIFICATIONS and CONFIRMED FIELDS.
2. Never add a browser, version, operating system, device, URL, number, error message, step or cause that is not stated there.
3. If something a developer needs is not stated, leave that field empty ("" or []) and ask about it in missing_info.
4. title: one line, under 80 characters, describing the wrong behaviour.
5. steps: short imperative sentences, one action each, in the order they happened.
6. expected: what the tester says should happen. actual: what happened instead.
7. environment: only browser, operating system, device, account type or build that are stated.
8. missing_info: at most 4 questions, most important first. Do not ask about anything already answered.
9. Copy every CONFIRMED FIELD exactly as given.
10. Reply with JSON only.

NOTES
"""
{notes}
"""

CLARIFICATIONS
Q: {question}
A: {answer}

CONFIRMED FIELDS
{field}: {value or JSON array}
```

### 5.4 Sensitivity scan patterns (`scanSensitive` → `{ kind, text, start, end }[]`)

| kind | pattern (case-insensitive) | label |
|---|---|---|
| email | `[\w.+-]+@[\w-]+(\.[\w-]+)+` | an email |
| ip | IPv4 `\b(?:\d{1,3}\.){3}\d{1,3}\b` | an IP address |
| internal-host | hosts that are `localhost` or end in `.internal`, `.corp`, `.local`, `.lan`, `.intranet`, or start with `staging.`, `dev.`, `qa.`, `admin.` | an internal URL |
| jwt | `\beyJ[\w-]+\.[\w-]+\.[\w-]*` | a token |
| bearer | `\bbearer\s+[\w.~+/-]{12,}` | a token |
| secret-like | `\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b` | a token |

Banner joins unique labels: "Found an internal URL, an email and a token."

### 5.5 Invention check rules (`inventionCheck(report, sourceText, acceptedFlags)` → `Flag[]`)

Source text = notes + all answers + locked field values. Comparison is case-insensitive with whitespace collapsed. Scan `title`, each `steps[i]`, `expected`, `actual`, each `environment[i]`:
- **version**: `\b\d+(?:\.\d+)+\b` and `\bv\d+\b`. Flagged if the digits don't appear in the source.
- **browser**: Chrome, Chromium, Safari, Firefox, Edge, Opera, Brave, Samsung Internet, Arc. Flagged if the word isn't in the source.
- **os**: Windows, macOS, Mac OS, OS X, Linux, Ubuntu, iOS, iPadOS, Android, ChromeOS. Synonyms: "mac" in the source covers macOS / Mac OS / OS X; "win" covers Windows.
- **device**: iPhone, iPad, Pixel, Galaxy, MacBook, Surface, desktop, laptop, tablet, mobile, phone. Synonyms: "mac" covers MacBook; "phone" covers mobile.
- **url**: `https?://\S+` or bare `\w+\.\w{2,}/\S*`. Flagged if not a substring of the source.
- **number**: integers ≥ 2 with or without units (`\b\d+(?:\s?(?:ms|s|sec|seconds|px|%|items|times))?\b`). Flagged if the number isn't in the source. Step-ordinal words like "1st" are ignored.
- **quoted**: text inside `"…"`, `'…'`, `“…”` of 2–40 characters. Flagged if not in the source.
- Skip any flag whose lowercased text is in `acceptedFlags`.

### 5.6 `parseReport(text)`
- Strip ```` ```json ```` fences, then `JSON.parse`. On failure, try the substring from the first `{` to the last `}`.
- Coerce: missing string fields → `""`, missing arrays → `[]`, non-string array items dropped, `missing_info` items with an unknown `field` → `"other"`, trim everything, drop empty steps, cap `missing_info` at 4 and `steps` at 15.
- Throw `ReportParseError` if the result is not an object or has no `title` and no `steps` and no `actual`.

---

## 6. Sample mode

Active when `settings.firebaseConfig` is null. Header chip: `Sample mode: no AI` (hatched grey). Badge: `Sample · no AI`. The Engine panel says "Add a Firebase config in Settings to use Gemini Nano on this device." Run time is a fixed 650 ms artificial delay, so the running state is visible. The badge shows the real elapsed time.

### 6.1 Example notes and their exact fixtures

`runSample` first looks for a fixture: `exampleId` set **and** notes unchanged from the example text (trimmed comparison) → that fixture. Otherwise it uses the rule engine (§6.2).

**E1 `filter-reset`: "Filter resets after Back"**
Notes:
```
trailhead demo shop. picked Tents in the category chips, list showed 4 tents. clicked the Ridgeline 2P tent, detail page opened fine. hit the browser back button -> list shows all products again and the Tents chip isn't selected anymore. expected to still only see tents. happens every time. chrome on my mac
```
Fixture:
```json
{
  "title": "Category filter resets to All after returning from a product page",
  "steps": [
    "Open the Trailhead Supply demo shop.",
    "Select the \"Tents\" category chip.",
    "Click the \"Ridgeline 2P\" tent to open its detail page.",
    "Press the browser Back button."
  ],
  "expected": "The list still shows only tents, with the Tents chip selected.",
  "actual": "The list shows all products and the Tents chip is no longer selected.",
  "environment": ["Chrome on Mac"],
  "missing_info": [
    { "field": "environment", "question": "Which Chrome version were you using? (You can find it at chrome://version.)" }
  ]
}
```

**E2 `vague`: "Vague notes"**
Notes:
```
back button on the shop is weird again, lost my place. same as last sprint
```
Fixture:
```json
{
  "title": "Shop loses the user's place after pressing Back",
  "steps": ["Press the browser Back button in the shop."],
  "expected": "",
  "actual": "",
  "environment": [],
  "missing_info": [
    { "field": "steps", "question": "Which page were you on, and what did you do just before pressing Back?" },
    { "field": "actual", "question": "What does \"lost my place\" mean here: did the scroll position, a filter, or a toggle reset?" },
    { "field": "expected", "question": "What should the page look like after pressing Back?" },
    { "field": "environment", "question": "Which browser and device were you using?" }
  ]
}
```
In Sample mode only, an example-E2 draft shows a link **"Fill example answers"** under the questions. It fills:
1. "Turned on In stock only, scrolled down to Cookware, opened the Trail Kettle, pressed Back."
2. "The In stock only toggle stays on but the page jumps back to the top."
3. "It should return to the same scroll position, at the Trail Kettle."
4. "Firefox on Windows laptop."

When the draft is E2 and all four answers match the supplied example answers, Update report returns **E2b**:
```json
{
  "title": "Scroll position is lost after returning from a product page",
  "steps": [
    "Open the Trailhead Supply demo shop.",
    "Turn on \"In stock only\".",
    "Scroll down to the Cookware products.",
    "Click the \"Trail Kettle\" to open its detail page.",
    "Press the browser Back button."
  ],
  "expected": "The list returns to the same scroll position, at the Trail Kettle.",
  "actual": "The \"In stock only\" toggle stays on, but the page jumps back to the top.",
  "environment": ["Firefox on Windows laptop"],
  "missing_info": [
    { "field": "frequency", "question": "Does this happen every time, or only sometimes?" }
  ]
}
```

**E3 `sensitive`: "Notes with internal details"**
Notes:
```
logged in as qa.lead@trailhead-test.example on https://staging.trailhead.internal/demo-shop
session token from devtools: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1sZWFkIn0.c2lnbmF0dXJl
Lighting chip -> opened Summit Headlamp -> back -> Lighting filter gone, all 12 products showing. expected Lighting to stay selected. edge on windows
```
(The token is fake and meaningless; its payload decodes to `{"sub":"qa-lead"}`.)
Typing or loading this switches to Local-only. Fixture:
```json
{
  "title": "Lighting filter resets after returning from the Summit Headlamp page",
  "steps": [
    "Log in to the staging demo shop at https://staging.trailhead.internal/demo-shop.",
    "Select the \"Lighting\" category chip.",
    "Open the \"Summit Headlamp\" detail page.",
    "Press the browser Back button."
  ],
  "expected": "The Lighting chip stays selected and only lighting products are shown.",
  "actual": "The Lighting filter is cleared and all 12 products are shown.",
  "environment": ["Edge on Windows", "Staging environment"],
  "missing_info": [
    { "field": "environment", "question": "Which Edge version and which staging build were you on?" }
  ]
}
```
Copying this report triggers the "includes an internal URL" confirm.

**Planted invention (to demo the check in Sample mode):** none of the fixtures invent anything. The demo of the invention check uses the rule engine's **"Show invention check" button**, available in Sample mode only. It appends `"Chrome 131"` to a copy of the environment and re-runs the check, so judges can see a flag. It is labelled "Simulate a made-up detail".

### 6.2 Rule engine (any other notes, deterministic)
1. Split the source text into clauses on newlines, `->`, `→`, `;`, `. `, `, then `, ` then `, ` and then `.
2. **steps**: clauses that start with or contain an action verb (`open|opened|click|clicked|tap|tapped|select|selected|pick|picked|choose|chose|change|changed|go|went|press|pressed|hit|type|typed|enter|entered|scroll|scrolled|add|added|remove|removed|submit|submitted|log in|logged in|sign in|navigate|navigated|back`). Capitalise and end with a period. Max 10.
3. **actual**: first clause matching `instead|shows|showing|reset|resets|gone|broke|broken|error|crash|fails|failed|nothing happens|doesn't|didn't|not working|blank|stuck|wrong`.
4. **expected**: first clause matching `expected|expect|should|supposed to`, with the leading "expected (to)" removed.
5. **environment**: browser/OS/device words found in the source (Title Case, joined as "Browser on OS").
6. **title**: the actual clause (or first clause), sentence-cased, at most 80 characters.
7. **missing_info**, in this order, at most 4: no steps → steps question; no actual → actual question; no expected → expected question; no environment → "Which browser and device were you using?"; a browser without a version → version question; no "every time / always / sometimes / once" in the source → frequency question.
8. Answers are added to the source text before the rules run, so answering a question fills the field.

---

## 7. Demo shop: planted bugs

`public/demo-shop/`: plain HTML/CSS/JS with no build step and its own simple styling, so it reads as a different product. A small banner says "Demo shop with planted bugs for Repro Offline".

Products (12): **Tents**: Ridgeline 2P, Ridgeline 3P, Cirrus UL 1P, Basecamp 4P. **Packs**: Switchback 28L, Switchback 45L, Daytrip 18L. **Lighting**: Summit Headlamp, Lantern Mini. **Cookware**: Trail Kettle, Nesting Pot Set, Spork Pair. Each has a price and `inStock` (Cirrus UL 1P, Daytrip 18L and Lantern Mini are out of stock).

Routes: `#/` list, `#/product/<slug>` detail with a "← Back to products" link and Add to cart (no-op toast).

- **Bug A (filter reset):** `let activeCategory = "All"`. `renderList()` is called on `hashchange` and starts with `activeCategory = "All"` (the planted line, commented `// BUG(planted): resets filter on every render`). The In stock toggle lives in `sessionStorage`, so it survives.
- **Bug B (scroll lost):** the list re-renders by replacing `innerHTML` and calls `window.scrollTo(0, 0)` on every route change (`// BUG(planted): always scrolls to top`).
- The list is tall enough to scroll at 1440×900: product cards have 160 px tall image placeholders (CSS-drawn, no external images).

---

## 8. Visual design

Direction: **lab notebook meets ticket**. Operate-mode restraint, with the craft in the details.
- **Colour tokens (oklch):** `--paper: oklch(0.975 0.008 85)`, `--surface: oklch(0.995 0.004 85)`, `--ink: oklch(0.24 0.02 260)`, `--ink-2: oklch(0.45 0.02 260)`, `--rule: oklch(0.88 0.01 85)`, `--signal: oklch(0.78 0.15 75)` (amber: gaps and flags only), `--signal-ink: oklch(0.42 0.11 65)`, `--device: oklch(0.45 0.11 155)` (green), `--cloud: oklch(0.48 0.09 250)` (slate blue), `--sample: oklch(0.55 0.01 260)` (grey, hatched with `repeating-linear-gradient`), `--danger: oklch(0.52 0.18 27)`. All text meets 4.5:1 contrast on paper/surface.
- **Type:** IBM Plex Sans 400/500/600 for UI and IBM Plex Mono 400/500 for notes, steps numbering and badges, self-hosted with `@fontsource`. Scale: 12 / 13 / 15 / 17 / 22 / 28. `font-variant-numeric: tabular-nums` on timers and counters.
- **Surfaces:** report pane = a ticket card on paper, radius 10 px, shadow `0 1px 0 oklch(0 0 0/.04), 0 8px 24px -12px oklch(0 0 0/.18)`, `border: 1px solid transparent`. Inputs keep visible 1 px borders (3:1).
- **Gaps:** dashed 1.5 px `--signal` border, `--signal-ink` label "Needs info", subtle amber tint background.
- **Motion:** `--ease-out: cubic-bezier(0.23,1,0.32,1)`. The report fields fade and rise 4 px with a 30 ms stagger (max 240 ms total). Buttons get a `scale(0.97)` press state over 160 ms. Badge swaps cross-fade. Everything respects `prefers-reduced-motion`.
- **Focus:** 2 px `--ink` outline with 2 px offset on every interactive element. Hover styles go inside `@media (hover:hover)`.
- **No** purple gradients, emoji, centred hero blocks, or icon fonts. Icons are inline SVG with `currentColor` and a 1.5 px stroke.

---

## 9. Judge scorecard (criterion → proof)

| Criterion | What proves it | Where |
|---|---|---|
| **Technological implementation**: Firebase AI Logic hybrid | `getGenerativeModel` with `InferenceMode.PREFER_ON_DEVICE` / `ONLY_ON_DEVICE`, the same JSON schema for `responseJsonSchema` + `responseConstraint`, `initializeDeviceModel` with progress, the `inferenceSource` badge, a why-cloud reason, App Check (reCAPTCHA Enterprise or debug token), SDK integration tests | `src/engine/hybrid.ts`, `src/engine/firebase.ts`, `src/engine/availability.ts`, `tests/firebaseRuntime.test.ts`; video 0:35–1:25 |
| Hybrid used meaningfully, not as decoration | Privacy routing: the sensitivity scan forces `ONLY_ON_DEVICE`, which never falls back (ADR 0002). Hybrid uses the cloud only when Nano isn't ready. The SDK's systemInstruction gap was found and designed around (ADR 0001) | `src/domain/sensitivity.ts`, docs/adr; video 1:25–1:55 |
| **Design**: a complete product | Drafts, autosave, edit + lock, export, settings, empty/loading/error states, keyboard shortcut, responsive layout | README screenshots; video throughout |
| **Potential impact** | A real job (QA → dev hand-off) and a real constraint (internal data in notes). Fewer "can't reproduce" round trips | README "The problem"; video 0:00–0:20, 2:30 |
| **Quality of idea** | "Asks instead of invents" + deterministic invention check + a reproducer test on a planted bug | `src/domain/invention.ts`; video 1:55–2:30 |
| Requirements | firebase ≥12.5 (`^13.4.0`), runtime calls to Firebase AI Logic, App Check, MIT license, public repo, video ≤3 min, hosted URL | `package.json`, LICENSE, README |

---

## 10. Video script (2:50 target, 3:00 hard cap)

Recording setup: Chrome with Gemini Nano **already prepared**, live config pasted, debug token registered, DevTools **closed** (the debug token is printed to the console). 1440×900, browser zoom 110 %.

| Time | Picture | Voice-over (approx.) |
|---|---|---|
| 0:00–0:12 | Messy notes in a text file next to a Jira-style "Can't reproduce" comment | "QA notes look like this. Turning them into a ticket a developer can reproduce is slow, and the notes often contain staging URLs and test accounts you shouldn't paste into a chatbot." |
| 0:12–0:22 | Repro Offline, empty state; header chips "Live" and "On-device: Ready" | "Repro Offline writes the bug report on your own machine, with Gemini Nano in Chrome through Firebase AI Logic." |
| 0:22–0:35 | Open the demo shop, click Tents → Ridgeline 2P → Back, filter resets | "Here's a shop with a planted bug. Pick a category, open a product, go back, and the filter is gone." |
| 0:35–1:05 | Type E1-style notes in your own words, press ⌘↵. Running "on this device", report appears, badge **On device · 3.8 s** | "I type what I'd normally scribble. One single-turn call in hybrid mode, and the badge comes straight from the SDK's inferenceSource. This ran on device." |
| 1:05–1:25 | Point at the environment field: "Chrome on Mac" plus the question "Which Chrome version?" Answer it, Update report, the field fills in | "Notice what it didn't do: it didn't invent a Chrome version. It asked. I answer, and it re-runs." |
| 1:25–1:55 | New draft, paste E3. The banner animates in and the switch flips to Local-only. Generate → On device. Quick cut to the Engine panel showing Local-only = ONLY_ON_DEVICE, "never uses the cloud" | "These notes have a staging URL, an email and a session token. The app spots that and locks this draft to Local-only, Firebase's ONLY_ON_DEVICE mode. If Nano weren't available it would stop, not upload." |
| 1:55–2:15 | New draft, paste E2 (vague). Report is mostly gaps plus four questions | "Vague notes get questions, not a confident fake report." |
| 2:15–2:30 | Show an invention-check flag (a cloud run with a short prompt that names a version, or the Sample-mode simulation). Hover the popover, press Remove | "And if a model ever adds a detail that isn't in your notes, a deterministic check flags it." |
| 2:30–2:45 | Split screen: a second developer gets only the copied Markdown and reproduces the bug on the first try (real recording, no staging) | "We handed the report to another developer, with no context. They reproduced it on the first try." |
| 2:45–2:55 | Quick montage of the drafts rail, copy Markdown, Settings and Sample mode badge | "Drafts stay in this browser, and Sample mode lets you try the reporting flow without a Firebase project." |
| 2:55–3:00 | Title card: Repro Offline · repo URL | "Repro Offline. Asks before it guesses." |

The 2:30 reproducer clip has to be recorded for real. If nobody is available, cut it and say "reproduce it yourself at /demo-shop" instead. Never stage it.

---

## 11. Devpost draft

**Title:** Repro Offline

**Tagline:** Rough QA notes in, reproducible bug report out. On your device, and it asks before it guesses.

**Built with:** firebase, firebase-ai-logic, gemini-nano, chrome-prompt-api, gemini, app-check, react, typescript, vite, indexeddb

**Description**

*Inspiration*: Every "can't reproduce" ticket costs a round trip. QA notes are written in shorthand and often contain internal URLs and test accounts, so testers can't, or shouldn't, paste them into a cloud chatbot. General AI writers also fill gaps with confident guesses like a made-up browser version, which sends developers down the wrong path.

*What it does*: Paste rough notes and get an editable bug report: title, steps, expected, actual, environment. Anything missing becomes a question instead of a guess. Answer it and the report updates. A deterministic invention check flags any version, browser, number or URL the report contains that wasn't in your notes. Notes with emails, internal hosts or tokens switch to Local-only automatically. Drafts stay in your browser.

*How we built it*: Firebase AI Logic's hybrid web SDK (`firebase` 13.4) with `InferenceMode.PREFER_ON_DEVICE` for normal notes and `ONLY_ON_DEVICE` for sensitive ones. Gemini Nano runs in Chrome via the Prompt API, with `gemini-3.5-flash-lite` as the cloud fallback. One JSON schema drives both `responseJsonSchema` (cloud) and `responseConstraint` (device). The UI badge reads `response.inferenceSource`, so it always says where a run really happened. App Check protects the cloud path. The app uses React, TypeScript and Vite, with IndexedDB for draft storage.

*Challenges*: We found that the SDK's on-device path drops `systemInstruction`, so all instructions go into one self-contained prompt that both models receive. `PREFER_ON_DEVICE` won't wait for a model download, so we added an explicit Prepare step and a "why did this run in the cloud" explanation. Small on-device models like to invent details, which is what the invention check is for.

*Accomplishments*: The app asks instead of inventing, and its privacy promise holds: Local-only never touches the network for inference. *(Only add a reproducer result if it was actually observed.)*

*What we learned*: Hybrid AI design is mostly about honesty: telling the user where something ran and what the model didn't know.

*What's next*: Screenshot and console-log input (when on-device multimodal arrives), team templates, a Jira/GitHub export with sensitive-detail redaction.

---

## 12. Submission checklist

- [ ] Public GitHub repo `RealCloudyPanda/BuildHybridAI` with MIT LICENSE
- [ ] `package.json` has `firebase` `^13.4.0` (≥12.5.0) and code imports `firebase/ai` and calls `generateContent` at runtime
- [ ] App Check initialised before any AI call (`src/engine/firebase.ts`). README shows debug-token setup
- [ ] Firebase project: AI Logic enabled (Gemini Developer API), App Check registered, debug token added *(owner)*
- [ ] Working Live demo and testing instructions, with free judging access through Dec 16, 2026, 5 pm ET. A hosted URL is encouraged. *(owner)*
- [ ] Public YouTube video ≤ 3:00, follows §10 *(owner)*
- [ ] Devpost entry with description (§11), summary of work built during the contest period, disclosure of any other pre-existing work incorporated into the project, built-with tags, repo URL, video URL, demo access and Web/Chrome platform
- [ ] README: screenshots, Sample vs Live, judging table, AI disclosure, Known limitations
- [ ] No secrets in git: `git grep -nE "AIza|FIREBASE_APPCHECK_DEBUG_TOKEN\s*=\s*['\"]"` returns nothing except docs/code that read the value at runtime
- [ ] Submit before **Nov 30 2026, 5:00 pm ET**

[Official contest rules](https://firebasehybridaihackathon.devpost.com/rules)
