import type { Report, Field, MissingField } from "./report";

export type { Report, Field, MissingField };
export type Privacy = "hybrid" | "local-only";
export type Source = "on_device" | "in_cloud" | "sample";
export type Availability = "available" | "downloadable" | "downloading" | "unavailable" | "unsupported";
export type ExampleId = "filter-reset" | "vague" | "sensitive";

export interface RunResult {
  report: Report;
  source: Source;
  ms: number;
  availabilityBefore: Availability | null;
  rawText?: string;
}

export interface Answer { question: string; field: MissingField; answer: string; answeredAt: number }

export type FlagKind = "version" | "browser" | "os" | "device" | "url" | "number" | "quoted";
export interface Flag { field: Field; index?: number; text: string; kind: FlagKind }

export type LastRun = Omit<RunResult, "report" | "rawText"> & { at: number; privacy: Privacy };

export interface Draft {
  id: string;
  createdAt: number;
  updatedAt: number;
  exampleId?: ExampleId;
  notes: string;
  privacy: Privacy;
  privacyOverride: boolean;
  answers: Answer[];
  report: Report | null;
  locked: Field[];
  acceptedFlags: string[];
  lastRun: LastRun | null;
}

export interface FirebaseWebConfig {
  apiKey: string;
  projectId: string;
  appId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface Settings {
  firebaseConfig: FirebaseWebConfig | null;
  recaptchaSiteKey: string;
  appCheckDebugToken: string;
}
