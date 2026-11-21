import { useEffect, useRef, useState } from "react";
import type { Availability, LastRun, Settings } from "../domain/types";
import { readAvailability } from "../engine/availability";
import { formatMs, whyCloud } from "./SourceBadge";
import { IconDevice } from "./icons";

const AV_LABEL: Record<Availability, string> = {
  available: "Ready",
  downloadable: "Needs download",
  downloading: "Downloading",
  unavailable: "Not supported",
  unsupported: "Not supported",
};

interface Props { live: boolean; settings: Settings; lastRun: LastRun | null; open: boolean; onToggle: () => void; onClose: () => void }

export function EnginePanel({ live, settings, lastRun, open, onToggle, onClose }: Props) {
  const [av, setAv] = useState<Availability | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) return;
    void readAvailability().then(setAv);
    if (!open && progress === null) return;
    const t = setInterval(() => void readAvailability().then(setAv), 2000);
    return () => clearInterval(t);
  }, [live, open, progress]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open, onClose]);

  const prepare = async () => {
    setErr("");
    setProgress(0);
    try {
      const [{ initFirebase }, { prepareDeviceModel }] = await Promise.all([import("../engine/firebase"), import("../engine/hybrid")]);
      const fb = initFirebase(settings);
      if (!fb) return;
      await prepareDeviceModel(fb.ai, (p) => setProgress(p));
      setProgress(1);
      setAv(await readAvailability());
    } catch (e) {
      setErr(String((e as Error).message ?? e));
      setProgress(null);
    }
  };

  const chipText = !live
    ? "On-device: n/a in Sample"
    : progress !== null && progress < 1
      ? `On-device: Downloading ${Math.round(progress * 100)}%`
      : `On-device: ${av ? AV_LABEL[av] : "…"}`;
  const unsupported = av === "unsupported" || av === "unavailable";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="chip hide-sm" aria-expanded={open} aria-haspopup="dialog" onClick={onToggle}>
        <IconDevice width={13} height={13} /> {chipText}
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Engine" style={{ left: 0 }}>
          <h2>Where reports run</h2>
          <div className="mode-map">
            <span>Hybrid = <code>InferenceMode.PREFER_ON_DEVICE</code></span>
            <span>Local-only = <code>InferenceMode.ONLY_ON_DEVICE</code>, never uses the cloud</span>
          </div>
          {!live ? (
            <div className="section">
              <p className="muted">Sample mode: no AI. Add a Firebase config in Settings to use Gemini Nano on this device.</p>
            </div>
          ) : (
            <div className="section">
              <dl>
                <dt>On-device model</dt><dd>{av ? `${AV_LABEL[av]} (${av})` : "checking…"}</dd>
              </dl>
              {!unsupported && av !== "available" && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-sm btn-primary" disabled={progress !== null && progress < 1} onClick={prepare}>
                    Prepare on-device model
                  </button>
                  {progress !== null && (
                    <div className="progress" role="progressbar" aria-label="Download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                      <i style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                  )}
                </div>
              )}
              {unsupported && (
                <ol>
                  <li>Use Chrome 139 or newer on desktop.</li>
                  <li>Open <code>chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</code> and set it to Enabled.</li>
                  <li>Restart Chrome, come back here and press Prepare.</li>
                </ol>
              )}
              {err && <p className="muted" style={{ color: "var(--danger)", marginTop: 8 }}>{err}</p>}
            </div>
          )}
          {lastRun && (
            <div className="section">
              <dl>
                <dt>Last run</dt><dd>{lastRun.source}</dd>
                <dt>Privacy</dt><dd>{lastRun.privacy}</dd>
                <dt>Time</dt><dd>{formatMs(lastRun.ms)}</dd>
                {lastRun.source === "in_cloud" && (<><dt>Why cloud</dt><dd>{whyCloud(lastRun.availabilityBefore)}</dd></>)}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
