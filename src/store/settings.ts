import type { FirebaseWebConfig, Settings } from "../domain/types";

export const SETTINGS_KEY = "repro-offline:settings:v1";
const DEFAULTS: Settings = { firebaseConfig: null, recaptchaSiteKey: "", appCheckDebugToken: "" };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function clearSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}

const KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"] as const;
const REQUIRED = ["apiKey", "projectId", "appId"] as const;

export type ParseConfigResult = { ok: true; config: FirebaseWebConfig } | { ok: false; error: string };

/** Accepts JSON or the JS object literal copied from the Firebase console. */
export function parseFirebaseConfig(input: string): ParseConfigResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "Paste your Firebase web config." };
  let found: Record<string, string> = {};
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") {
      for (const k of KEYS) if (typeof obj[k] === "string") found[k] = obj[k];
    }
  } catch {
    found = {};
    const re = /(\w+)\s*:\s*["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if ((KEYS as readonly string[]).includes(m[1])) found[m[1]] = m[2];
    }
  }
  for (const k of REQUIRED) {
    if (!found[k]) return { ok: false, error: `Missing ${k}` };
  }
  return { ok: true, config: found as unknown as FirebaseWebConfig };
}
