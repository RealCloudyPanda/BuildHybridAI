# Grill log: Repro Offline

The design was worked out as a self-interview ("grill-with-docs": grilling plus domain modelling) while the owner was asleep. The owner's standing instruction: **accept the recommended answer**. Each question has a recommended answer (➡️) and the decision taken (✅). Terms are defined in [GLOSSARY.md](../GLOSSARY.md). Decisions that are hard to reverse are in [docs/adr/](adr/).

---

## Round 1: Who and what

**Q1. Who is the one user?**
➡️ A manual QA tester or a developer doing exploratory testing on a web app. They keep messy notes while clicking around and have to turn them into a ticket that someone else can reproduce.
✅ Accepted. Secondary user: the developer who receives the ticket (the **reproducer**).

**Q2. What is the one painful task?**
➡️ Turning "changed the filter, went back, filter reset" into a ticket with numbered steps, expected and actual results, and environment, without forgetting the detail the developer will ask about anyway.
✅ Accepted.

**Q3. What makes this different from "ChatGPT, write me a bug report"?**
➡️ Three things. (a) It **refuses to invent**: unknowns become **missing-info questions**, and a deterministic **invention check** flags any version, browser or number that isn't in the notes. (b) Notes stay **on device** by default, and sensitive notes are locked to device-only. (c) A **source badge** shows honestly where each run happened.
✅ Accepted. This is the pitch.

**Q4. Which prize do we design for?**
➡️ Best Web/Chrome App. Every judging criterion should map to something visible in the first 90 seconds of the video.
✅ Accepted. Grand Prize is a stretch. The same evidence serves both.

---

## Round 2: Hybrid inference behaviour

**Q5. Which inference modes do we expose?**
➡️ Two privacy settings, not four SDK modes. **Hybrid** (`PREFER_ON_DEVICE`) and **Local-only** (`ONLY_ON_DEVICE`). The cloud-first modes add nothing for this user.
✅ Accepted.

**Q6. What happens when Local-only is on but Gemini Nano is not available?**
➡️ Show a clear error with setup steps (flag, restart, Prepare button). **Never** fall back to the cloud silently.
✅ Accepted → [ADR 0002](adr/0002-local-only-never-falls-back.md).

**Q7. When does Local-only turn on?**
➡️ It turns on automatically when the **sensitivity scan** finds an email, IP address, internal hostname (`localhost`, `*.internal`, `*.corp`, `*.local`, `staging.`), a token-like string, a JWT or a `Bearer` header. The banner lists what was found. The user can turn it off, and that choice sticks for that draft.
✅ Accepted.

**Q8. In Hybrid mode a fresh browser silently goes to the cloud because `PREFER_ON_DEVICE` won't wait for a download. How do we handle that?**
➡️ An **Engine panel** shows on-device availability (Ready / Needs download / Downloading n% / Not supported). It has a **Prepare on-device model** button that calls `model.initializeDeviceModel(progress)` from a click. We read availability before each run, so a cloud badge can say why: "Ran in cloud: on-device model was still downloading".
✅ Accepted.

**Q9. Where do the instructions go: `systemInstruction` or the prompt?**
➡️ In one user prompt string. The SDK drops `systemInstruction` on device (verified in source), and one prompt gives both sources identical input.
✅ Accepted → [ADR 0001](adr/0001-instructions-inline-in-single-prompt.md).

**Q10. How do answers to missing-info questions reach the model, given on-device is single-turn?**
➡️ Rebuild the whole prompt: notes, plus the Q&A pairs as "Clarifications", plus the user's edited fields marked "do not change". Then run one fresh call. No chat history.
✅ Accepted.

**Q11. What if the user edited the report by hand and then re-runs?**
➡️ Fields the user edited are **locked**. They go into the prompt as "Confirmed by tester" and are merged back unchanged after the run. Unlocked fields are replaced.
✅ Accepted.

**Q12. Token budget?**
➡️ The docs say on-device requests over 4096 tokens are unsupported. Cap notes at **4,000 characters** with a live counter. Keep instructions under ~600 tokens. Over the cap, the Generate button is disabled with a message.
✅ Accepted.

**Q13. Streaming?**
➡️ No. Structured JSON has to be complete to parse. Show a calm progress state with elapsed seconds instead.
✅ Accepted.

**Q14. Which cloud model?**
➡️ `gemini-3.5-flash-lite`, the SDK's own hybrid default, set explicitly. Backend: `GoogleAIBackend` (has a no-cost tier).
✅ Accepted.

---

## Round 3: Output shape and honesty

**Q15. What is in the report?**
➡️ `title`, `steps[]`, `expected`, `actual`, `environment[]`, `missing_info[{ field, question }]`. No severity, priority, root cause or "possible fix": the model would have to make those up.
✅ Accepted. The schema is in SPEC §5.

**Q16. What if a field is unknown?**
➡️ Empty string or empty array, plus a missing-info question for that field. The UI shows the empty field as a dashed **gap** labelled "Needs info". It never shows "N/A" or a guess.
✅ Accepted.

**Q17. Do we trust the model to obey "don't invent"?**
➡️ No. A deterministic **invention check** runs after every model call. It pulls version numbers, browser/OS/device names, URLs, numbers with units and quoted UI labels out of the report and flags any that are not in the source text (notes + answers + locked fields). Flagged text gets a "Not in your notes" mark with Remove / Keep.
✅ Accepted. This catches Gemini Nano's typical failure (made-up "Chrome 120") and is easy to demo.

**Q18. What if the model returns invalid JSON?**
➡️ A hand-written `parseReport` validator coerces safe shapes (missing arrays become empty), rejects the rest, and retries once with the same prompt. If the retry fails: "The model returned something unreadable. Try again."
✅ Accepted. No zod; the schema is small.

**Q19. What does the environment field contain?**
➡️ Only facts the tester gave. A separate **"Add this browser"** button can append the tester's own user agent to the source text, but only when clicked: their browser might not be the one under test.
✅ Accepted.

---

## Round 4: Storage, config, sample mode

**Q20. Where are drafts stored?**
➡️ IndexedDB through `idb-keyval`, autosaved (debounced 400 ms). Drafts appear in a left rail, newest first, and can be deleted. No database or server.
✅ Accepted.

**Q21. How does the app get Firebase config without env vars?**
➡️ A Settings sheet: paste the Firebase web config object (JSON or the JS literal from the console), plus an optional reCAPTCHA Enterprise site key and an optional App Check debug token. Stored in `localStorage`. Saving reloads the page, because App Check debug mode is read once per page load.
✅ Accepted → [ADR 0003](adr/0003-runtime-config-and-sample-mode.md).

**Q22. What do judges see with no config?**
➡️ **Sample mode**, labelled "Sample mode: no AI" in the source badge and the header. A deterministic rule-based engine plus exact fixtures for the three example notes. Same UI, same invention check, same flow.
✅ Accepted.

**Q23. Can Local-only run with no Firebase config, since it never touches the network?**
➡️ No. `AIModel` requires apiKey, projectId and appId. Faking a config to get around that would be misleading. Without config it's Sample mode.
✅ Accepted (alternative rejected).

**Q24. Export?**
➡️ "Copy as Markdown" (GitHub/Jira-friendly) and "Copy as plain text". No "Open GitHub issue" link: that would put notes in a URL, against the privacy pitch.
✅ Accepted.

---

## Round 5: Stack and demo

**Q25. Stack?**
➡️ Vite + React + TypeScript, plain CSS with custom properties, no UI kit. Static output, deployable to Firebase Hosting or any static host. `vite-plugin-pwa` for an offline app shell.
✅ Accepted.

**Q26. Where does the planted-bug demo app live?**
➡️ `public/demo-shop/`: plain HTML/JS served at `/demo-shop/` by the same server and host. It's a fictional outdoor-gear shop called "Trailhead Supply". The category filter resets to "All" after you open a product and press Back, because the filter lives in a variable that `renderList()` resets. A second, quieter bug: the "In stock only" toggle survives Back but the scroll position is lost. The vague-notes example points at it.
✅ Accepted.

**Q27. What is the demo moment?**
➡️ (1) Type rough notes about the shop bug. The report is generated on device with an "On device" badge. A second person follows only the report and hits the bug on the first try. (2) Paste vague notes ("checkout broke sometimes"). The app returns gaps and three questions instead of a made-up report. (3) Paste notes with a staging URL and an email. Local-only switches on by itself.
✅ Accepted.

**Q28. Visual direction?**
➡️ "Lab notebook meets ticket". Warm paper background, ink-dark text, IBM Plex Sans for UI and Plex Mono for notes and steps, one signal colour (amber) reserved for gaps and flags. Source badges: deep green = on device, slate blue = cloud, grey with diagonal hatching = sample. Two-pane layout (Notes | Report) with a narrow drafts rail. Operate-mode restraint: no gradients, no emoji, nothing centred.
✅ Accepted.

**Q29. Dark mode?**
➡️ Not in scope. One well-made light theme. Tokens are structured so dark mode can be added later.
✅ Accepted.

**Q30. Tests?**
➡️ Vitest for the pure domain modules (prompt, parse, invention check, sensitivity scan, sample engine, markdown) and the engine adapter with `firebase/ai` mocked. One Playwright smoke test of the Sample-mode flow. Live Firebase calls are checked by hand (the owner has to supply a config). That limit is stated honestly in the README.
✅ Accepted.
