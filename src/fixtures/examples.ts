import type { Report } from "../domain/report";
import type { ExampleId } from "../domain/types";

export interface Example { id: ExampleId; label: string; notes: string }

export const EXAMPLES: Example[] = [
  {
    id: "filter-reset",
    label: "Filter resets after Back",
    notes:
      "trailhead demo shop. picked Tents in the category chips, list showed 4 tents. clicked the Ridgeline 2P tent, detail page opened fine. hit the browser back button -> list shows all products again and the Tents chip isn't selected anymore. expected to still only see tents. happens every time. chrome on my mac",
  },
  {
    id: "vague",
    label: "Vague notes",
    notes: "back button on the shop is weird again, lost my place. same as last sprint",
  },
  {
    id: "sensitive",
    label: "Notes with internal details",
    notes: `logged in as qa.lead@trailhead-test.example on https://staging.trailhead.internal/demo-shop
session token from devtools: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS1sZWFkIn0.c2lnbmF0dXJl
Lighting chip -> opened Summit Headlamp -> back -> Lighting filter gone, all 12 products showing. expected Lighting to stay selected. edge on windows`,
  },
];

export const FIXTURES: Record<ExampleId, Report> = {
  "filter-reset": {
    title: "Category filter resets to All after returning from a product page",
    steps: [
      "Open the Trailhead Supply demo shop.",
      'Select the "Tents" category chip.',
      'Click the "Ridgeline 2P" tent to open its detail page.',
      "Press the browser Back button.",
    ],
    expected: "The list still shows only tents, with the Tents chip selected.",
    actual: "The list shows all products and the Tents chip is no longer selected.",
    environment: ["Chrome on Mac"],
    missing_info: [
      { field: "environment", question: "Which Chrome version were you using? (You can find it at chrome://version.)" },
    ],
  },
  vague: {
    title: "Shop loses the user's place after pressing Back",
    steps: ["Press the browser Back button in the shop."],
    expected: "",
    actual: "",
    environment: [],
    missing_info: [
      { field: "steps", question: "Which page were you on, and what did you do just before pressing Back?" },
      { field: "actual", question: 'What does "lost my place" mean here: did the scroll position, a filter, or a toggle reset?' },
      { field: "expected", question: "What should the page look like after pressing Back?" },
      { field: "environment", question: "Which browser and device were you using?" },
    ],
  },
  sensitive: {
    title: "Lighting filter resets after returning from the Summit Headlamp page",
    steps: [
      "Log in to the staging demo shop at https://staging.trailhead.internal/demo-shop.",
      'Select the "Lighting" category chip.',
      'Open the "Summit Headlamp" detail page.',
      "Press the browser Back button.",
    ],
    expected: "The Lighting chip stays selected and only lighting products are shown.",
    actual: "The Lighting filter is cleared and all 12 products are shown.",
    environment: ["Edge on Windows", "Staging environment"],
    missing_info: [{ field: "environment", question: "Which Edge version and which staging build were you on?" }],
  },
};

export const FIXTURE_E2B: Report = {
  title: "Scroll position is lost after returning from a product page",
  steps: [
    "Open the Trailhead Supply demo shop.",
    'Turn on "In stock only".',
    "Scroll down to the Cookware products.",
    'Click the "Trail Kettle" to open its detail page.',
    "Press the browser Back button.",
  ],
  expected: "The list returns to the same scroll position, at the Trail Kettle.",
  actual: 'The "In stock only" toggle stays on, but the page jumps back to the top.',
  environment: ["Firefox on Windows laptop"],
  missing_info: [{ field: "frequency", question: "Does this happen every time, or only sometimes?" }],
};

/** "Fill example answers" for E2, in question order. */
export const E2_EXAMPLE_ANSWERS = [
  "Turned on In stock only, scrolled down to Cookware, opened the Trail Kettle, pressed Back.",
  "The In stock only toggle stays on but the page jumps back to the top.",
  "It should return to the same scroll position, at the Trail Kettle.",
  "Firefox on Windows laptop.",
];

export const exampleById = (id: ExampleId) => EXAMPLES.find((e) => e.id === id)!;
