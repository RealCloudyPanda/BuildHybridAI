# Submission pack: Firebase #BuildHybridAI 2026 (Best Web/Chrome)

Draft for the owner. Nothing here has been submitted. Rules checked on firebasehybridaihackathon.devpost.com on 2026-11-21.

## Rules that matter (as read on 2026-11-21)

| Item | What the rules say | Status |
| --- | --- | --- |
| Deadline | **Mon Nov 30 2026, 2:00 PM PT (5:00 PM ET)**. Judging Dec 10–16; winners around Dec 21. | **9 days left.** Aim to submit by **Sat Nov 28**. |
| Eligibility | Above the age of majority where you live. Quebec, Italy, Brazil and some other places excluded. | Owner to confirm. |
| New and existing work | Newly created, or significantly updated during the period. AI coding assistants are allowed, but you must **disclose any pre-existing code** and **summarise what you built during the period**. | First commit 2026-11-20. Summary drafted below. |
| Firebase AI Logic | The implementation must use Firebase AI Logic. | `firebase/ai` hybrid calls are in the code, but **no live run has ever happened against a real Firebase project**. |
| Testing access | A link or test build, free and unrestricted until judging ends (Dec 16). A hosted project is "highly encouraged". No production API keys or project secrets in the submission. | Not hosted. Sample mode works with no config. |
| Video | **No longer than 3 minutes** (only the first 3 are judged), public on YouTube, English or English subtitles, showing the app working on its platform. | Not recorded. Script below runs 2:50. |
| Judging (Stage Two, equally weighted, 1–5 each) | Technological Implementation (how well it uses **hybrid inference**), Design, Potential Impact, Quality of the Idea. Ties go to the first criterion. | |

**The blocker.** The entry's core claim is hybrid inference, and that has only been tested against simulated services. Before recording: create a Firebase project, enable AI Logic (Gemini Developer API), register App Check, paste the config into Settings, prepare Gemini Nano in Chrome, and get one real `On device` run and one real `In cloud` run. If either fails, fix it first; the video can't fake it.

## Video script (target 2:50, hard cap 3:00)

Setup: desktop Chrome with Gemini Nano already prepared, your live config saved in Settings, **DevTools closed** (App Check debug mode prints the token to the console). 1440×900, zoom 110%. Every badge and time on screen must come from the take you film.

| Time | Picture | Voice-over |
| --- | --- | --- |
| 0:00–0:15 | Cold open: paste the notes with a staging URL, an email and a token. The underline appears and the switch flips to **Local-only** by itself. Generate. Badge reads `On device`. | "These QA notes contain a staging URL, an email and a session token. Watch: the app locks this draft to on-device only, and the report is written by Gemini Nano on this laptop. Nothing was uploaded." |
| 0:15–0:30 | Messy notes in a text file next to a "Can't reproduce" ticket comment. | "Turning notes like these into a ticket a developer can reproduce is slow, and the notes often hold things you shouldn't paste into a chatbot." |
| 0:30–0:45 | Demo shop: Tents → Ridgeline 2P → Back; the filter is gone. | "Here's a demo shop with a planted bug. Pick a category, open a product, go back, and the filter resets." |
| 0:45–1:10 | Type notes in your own words, press ⌘↵. The report appears; badge `On device · [[real time from your take]]`. | "I type what I'd normally scribble. One call through Firebase AI Logic in hybrid mode. The badge comes straight from the SDK's `inferenceSource`." |
| 1:10–1:30 | Environment field shows a gap plus "Which Chrome version?". Answer it, **Update report**, the field fills in. | "Notice what it didn't do. It didn't invent a Chrome version. It asked. I answer, and it re-runs." |
| 1:30–1:55 | Engine panel: Hybrid = `PREFER_ON_DEVICE`, Local-only = `ONLY_ON_DEVICE`. Then a Hybrid run on a machine or profile without Nano: badge `In cloud` with the why-cloud reason. | "Normal notes use hybrid: Nano when it's ready, Gemini in the cloud when it isn't, and the app tells you why. Sensitive notes use ONLY_ON_DEVICE, which never falls back. If Nano weren't available, it would stop, not upload." |
| 1:55–2:15 | Vague notes ("back button on the shop is weird again"). The report is mostly gaps plus questions. | "Vague notes get questions, not a confident fake report." |
| 2:15–2:30 | An invention-check flag: a real one if a live run produced it, otherwise **Simulate a made-up detail** in Sample mode, said out loud as a simulation. Press Remove. | "And if a model ever adds a detail that isn't in your notes, a deterministic check flags it." |
| 2:30–2:45 | **Only if it really happened:** a second person reproduces the bug from the copied Markdown alone. Otherwise: "Try it yourself at /demo-shop." | [[OWNER: real reproducer result, or cut]] |
| 2:45–2:50 | Title card: Repro Offline, repo and demo URLs. | "Repro Offline. Asks before it guesses." |

## Devpost text

**Project name:** Repro Offline

**Elevator pitch** (≤200 chars):

> Rough QA notes in, reproducible bug report out. Gemini Nano writes it on your device through Firebase AI Logic, sensitive notes never leave, and it asks instead of guessing.
