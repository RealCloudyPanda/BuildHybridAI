import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } from "firebase/app-check";
import { getAI, GoogleAIBackend, type AI } from "firebase/ai";
import type { Settings } from "../domain/types";

export interface FirebaseHandles { app: FirebaseApp; ai: AI }

let cached: FirebaseHandles | null | undefined;

export function initFirebase(settings: Settings): FirebaseHandles | null {
  if (cached !== undefined) return cached;
  if (!settings.firebaseConfig) {
    cached = null;
    return cached;
  }
  if (settings.appCheckDebugToken) {

    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      settings.appCheckDebugToken;
  }
  const app = initializeApp(settings.firebaseConfig);
  initializeAppCheck(app, {
    provider: settings.recaptchaSiteKey
      ? new ReCaptchaEnterpriseProvider(settings.recaptchaSiteKey)
      : new CustomProvider({
          getToken: () =>
            Promise.reject(new Error("No App Check site key. Add a debug token or site key in Settings.")),
        }),
    isTokenAutoRefreshEnabled: true,
  });
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  cached = { app, ai };
  return cached;
}

export function resetFirebaseForTests() {
  cached = undefined;
}
