import { EngineError } from "../engine/errors";
import { IconAlert } from "./icons";

interface Props { error: EngineError; onOpenEngine: () => void; onSwitchHybrid?: () => void; onRetry: () => void }

export function ErrorCard({ error, onOpenEngine, onSwitchHybrid, onRetry }: Props) {
  const deviceIssue = error.code === "device-unavailable" || error.code === "offline-no-device";
  return (
    <div className="error-card" role="alert">
      <h3><IconAlert /> Couldn't write the report</h3>
      <p>{error.message}</p>
      {error.code === "device-unavailable" && <p>No cloud call was made. Local-only never falls back to the cloud.</p>}
      {error.detail && <code>{error.detail}</code>}
      <div className="row">
        {deviceIssue && <button type="button" className="btn btn-sm" onClick={onOpenEngine}>Set up on-device model</button>}
        {error.code === "device-unavailable" && onSwitchHybrid && (
          <button type="button" className="btn btn-sm" onClick={onSwitchHybrid}>Switch to Hybrid</button>
        )}
        <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>Try again</button>
      </div>
    </div>
  );
}
