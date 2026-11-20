import { useEffect, useState, type ReactNode } from "react";
import type { Field, Report } from "../domain/report";
import type { Draft, Privacy } from "../domain/types";
import type { EngineError } from "../engine/errors";
import { EditableField, LockButton } from "./EditableField";
import { StepsEditor } from "./StepsEditor";
import { SourceBadge, whyCloud } from "./SourceBadge";
import { ErrorCard } from "./ErrorCard";
import { IconPlus, IconX } from "./icons";

export interface Running { startedAt: number; privacy: Privacy; live: boolean }

interface Props {
  draft: Draft;
  running: Running | null;
  error: EngineError | null;
  onEdit: (field: Field, value: string | string[]) => void;
  onToggleLock: (f: Field) => void;
  onOpenEngine: () => void;
  onRetry: () => void;
  onSwitchHybrid: () => void;
  renderPreview?: (field: Field, index?: number) => ReactNode | undefined;
  summary?: ReactNode;
  below?: ReactNode;
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  return <span className="running-time">{Math.max(0, (now - since) / 1000).toFixed(1)} s</span>;
}

function where(r: Running) {
  if (!r.live) return "with the sample engine";
  return r.privacy === "local-only" ? "on this device" : "on this device or in the cloud";
}

export function ReportPane(p: Props) {
  const { draft, running, error } = p;
  const report = draft.report;

  if (running) {
    return (
      <>
        <h2 className="pane-title">Report</h2>
        <div className="ticket" style={{ padding: 0 }} aria-busy="true">
          <div className="running">
            <span className="spinner" aria-hidden="true" />
            <span className="running-text">Writing {where(running)}…</span>
            <Elapsed since={running.startedAt} />
          </div>
          <div className="skeleton" aria-hidden="true">
            <i style={{ width: "70%", height: 18 }} /><i style={{ width: "92%" }} /><i style={{ width: "84%" }} /><i style={{ width: "60%" }} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="pane-title">Report</h2>
      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorCard error={error} onOpenEngine={p.onOpenEngine} onRetry={p.onRetry} onSwitchHybrid={draft.privacy === "local-only" ? p.onSwitchHybrid : undefined} />
        </div>
      )}
      {!report && !error && (
        <div className="report-empty">
          <h2>Your report appears here.</h2>
          <p>Nothing is sent anywhere until you press Write report.</p>
        </div>
      )}
      {report && <ReportCard {...p} report={report} />}
    </>
  );
}

function ReportCard({ draft, report, onEdit, onToggleLock, renderPreview, summary, below }: Props & { report: Report }) {
  const locked = (f: Field) => draft.locked.includes(f);
  const run = draft.lastRun;
  return (
    <>
      <article className="ticket" key={run?.at}>
        <div className="report-meta">
          {run && <SourceBadge source={run.source} ms={run.ms} availabilityBefore={run.availabilityBefore} />}
          {summary}
        </div>
        {run?.source === "in_cloud" && run.privacy === "hybrid" && (
          <p className="why-cloud" style={{ margin: "-8px 0 8px" }}>Why the cloud: {whyCloud(run.availabilityBefore)}</p>
        )}
        <EditableField field="title" label="Title" big index={0} value={report.title} locked={locked("title")} onChange={(v) => onEdit("title", v)} onToggleLock={onToggleLock} preview={renderPreview?.("title")} />
        <StepsEditor steps={report.steps} index={1} locked={locked("steps")} onChange={(s) => onEdit("steps", s)} onToggleLock={onToggleLock} renderPreview={renderPreview} />
        <EditableField field="expected" label="Expected" index={2} value={report.expected} locked={locked("expected")} onChange={(v) => onEdit("expected", v)} onToggleLock={onToggleLock} preview={renderPreview?.("expected")} />
        <EditableField field="actual" label="Actual" index={3} value={report.actual} locked={locked("actual")} onChange={(v) => onEdit("actual", v)} onToggleLock={onToggleLock} preview={renderPreview?.("actual")} />
        <EnvironmentEditor env={report.environment} locked={locked("environment")} onChange={(e) => onEdit("environment", e)} onToggleLock={onToggleLock} renderPreview={renderPreview} />
        {below}
      </article>
    </>
  );
}

function EnvironmentEditor({ env, locked, onChange, onToggleLock, renderPreview }: {
  env: string[]; locked: boolean; onChange: (e: string[]) => void; onToggleLock: (f: Field) => void;
  renderPreview?: (field: Field, index?: number) => ReactNode | undefined;
}) {
  const isGap = env.length === 0;
  return (
    <div className="field" style={{ ["--i" as string]: 4 }}>
      <div className="field-head">
        <span className="field-label" id="env-label">Environment</span>
        {isGap && <span className="gap-tag">Needs info</span>}
        <LockButton field="environment" locked={locked} onToggle={onToggleLock} />
      </div>
      <div className="env-chips" role="group" aria-labelledby="env-label">
        {env.map((e, i) => (
          <span className="env-chip" key={i}>
            {renderPreview?.("environment", i) ?? (
              <input aria-label={`Environment ${i + 1}`} value={e} onChange={(ev) => onChange(env.map((x, j) => (j === i ? ev.target.value : x)))} />
            )}
            <button type="button" className="icon-btn sm" aria-label={`Remove ${e || "environment item"}`} onClick={() => onChange(env.filter((_, j) => j !== i))}><IconX /></button>
          </span>
        ))}
        <button type="button" className={"btn btn-sm btn-ghost env-add" + (isGap ? " gap" : "")} onClick={() => onChange([...env, ""])}>
          <IconPlus /> Add
        </button>
      </div>
    </div>
  );
}
