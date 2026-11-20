# Glossary

The words this project uses, so the code, the UI and the docs say the same thing.

**Notes**: The tester's rough, unstructured text about what happened. The only source of truth for the report.
_Avoid_: input, prompt, description.

**Bug report** (or **report**): The structured result: title, steps, expected, actual, environment, plus missing-info questions.
_Avoid_: ticket, issue, output.

**Draft**: One saved working session: notes, answers, report and run history, kept on this device.
_Avoid_: document, project, file.

**Missing-info question**: A question the report asks because the notes don't say something a reproducer needs. Asked instead of guessing.
_Avoid_: clarification prompt, follow-up, TODO.

**Answer**: The tester's reply to a missing-info question. It becomes part of the source text for the next run.
_Avoid_: response, reply.

**Gap**: A report field that is empty because the information is missing. Shown as "Needs info".
_Avoid_: placeholder, N/A, unknown.

**Source text**: Everything the report may draw on: notes, answers and locked fields. Nothing else.
_Avoid_: context.

**Locked field**: A report field the tester edited by hand. Later runs keep it unchanged.
_Avoid_: pinned, frozen, override.

**Invention check**: The automatic check that flags anything in the report (a version, browser, number, URL or label) that isn't in the source text.
_Avoid_: hallucination detector, fact check, grounding score.

**Flag**: One item the invention check marked as "Not in your notes".
_Avoid_: warning, error.

**Sensitivity scan**: The automatic check that finds emails, internal hostnames, IP addresses and token-like strings in the notes.
_Avoid_: PII detector, DLP.

**Privacy setting**: Either **Hybrid** or **Local-only**.
_Avoid_: inference mode (that is the SDK term), engine mode.

**Hybrid**: Run on this device when the on-device model is ready, otherwise in the cloud.
_Avoid_: auto, smart mode.

**Local-only**: Run only on this device. If that isn't possible, show an error. Never use the cloud.
_Avoid_: offline mode, private mode.

**Run**: One attempt to generate or update a report from the source text.
_Avoid_: call, request, generation.

**Source badge**: The label on a report that says where its last run actually happened: On device, In cloud, or Sample.
_Avoid_: model indicator, status pill.

**On-device model**: The language model built into Chrome (Gemini Nano).
_Avoid_: local LLM, Nano (in UI copy).

**Prepare**: Make the on-device model ready, downloading it if needed.
_Avoid_: install, warm up.

**Sample mode**: The app with no Firebase config. Reports come from a fixed, rule-based engine with no AI, and are always labelled that way.
_Avoid_: demo mode, mock mode, offline mode.

**Live mode**: The app with a Firebase config, using Firebase AI Logic.
_Avoid_: real mode, production.

**Reproducer**: The person who follows a report to make the bug happen again.
_Avoid_: dev, assignee.

**Planted bug**: A bug put on purpose into the demo shop to show the app working.
_Avoid_: fake bug, test bug.

**Demo shop**: "Trailhead Supply", the small fictional store in this repo that contains the planted bugs.
_Avoid_: sample app, test app.
