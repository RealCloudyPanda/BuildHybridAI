import { useEffect, useRef, useState } from "react";
import type { Settings } from "../domain/types";
import { clearSettings, parseFirebaseConfig, saveSettings } from "../store/settings";
import { IconX } from "./icons";

interface Props { settings: Settings; onClose: () => void }

export function SettingsDrawer({ settings, onClose }: Props) {
  const [config, setConfig] = useState(settings.firebaseConfig ? JSON.stringify(settings.firebaseConfig, null, 2) : "");
  const [siteKey, setSiteKey] = useState(settings.recaptchaSiteKey);
  const [token, setToken] = useState(settings.appCheckDebugToken);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector("textarea")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    const r = parseFirebaseConfig(config);
    if (!r.ok) return setError(r.error);
    saveSettings({ firebaseConfig: r.config, recaptchaSiteKey: siteKey.trim(), appCheckDebugToken: token.trim() });
    location.reload();
  };
  const remove = () => {
    clearSettings();
    location.reload();
  };

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="settings-h">
        <div className="head">
          <h2 id="settings-h">Settings</h2>
          <button type="button" className="icon-btn" aria-label="Close settings" onClick={onClose}><IconX /></button>
        </div>
        <p className="help">
          Live mode uses Firebase AI Logic: Gemini Nano on this device, with Gemini in the cloud as the Hybrid fallback.
          Stored only in this browser (localStorage). Never sent anywhere except Firebase.
        </p>
        <label>
          Firebase web config
          <textarea className="input" rows={8} value={config} placeholder={'const firebaseConfig = {\n  apiKey: "…",\n  projectId: "…",\n  appId: "…"\n};'} onChange={(e) => { setConfig(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "cfg-err" : undefined} />
        </label>
        {error && <p className="err" id="cfg-err" role="alert">{error}</p>}
        <label>
          reCAPTCHA Enterprise site key <span className="help">(optional, for a hosted URL)</span>
          <input className="input" value={siteKey} onChange={(e) => setSiteKey(e.target.value)} autoComplete="off" />
        </label>
        <label>
          App Check debug token <span className="help">(optional, for localhost)</span>
          <span className="pw">
            <input className="input" type={show ? "text" : "password"} value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
            <button type="button" className="btn btn-sm" style={{ height: 38 }} onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
          </span>
        </label>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={save}>Save and reload</button>
          {settings.firebaseConfig && <button type="button" className="btn" onClick={remove}>Remove config</button>}
        </div>
        <p className="help">Without a config the app runs in Sample mode: a rule-based engine with no AI, so every screen still works.</p>
      </div>
    </>
  );
}
