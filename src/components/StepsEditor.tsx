import type { ReactNode } from "react";
import type { Field } from "../domain/report";
import { LockButton } from "./EditableField";
import { IconDown, IconPlus, IconUp, IconX } from "./icons";

interface Props {
  steps: string[];
  locked: boolean;
  index: number;
  onChange: (steps: string[]) => void;
  onToggleLock: (f: Field) => void;
  renderPreview?: (field: Field, index?: number) => ReactNode | undefined;
}

export function StepsEditor({ steps, locked, index, onChange, onToggleLock, renderPreview }: Props) {
  const set = (i: number, v: string) => onChange(steps.map((s, j) => (j === i ? v : s)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...steps];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const isGap = steps.length === 0;
  return (
    <div className="field" style={{ ["--i" as string]: index }}>
      <div className="field-head">
        <span className="field-label" id="steps-label">Steps to reproduce</span>
        {isGap && <span className="gap-tag">Needs info</span>}
        <LockButton field="steps" locked={locked} onToggle={onToggleLock} />
      </div>
      <ol className="steps" aria-labelledby="steps-label">
        {steps.map((s, i) => (
          <li className="step" key={i}>
            {renderPreview?.("steps", i) ?? (
              <textarea rows={1} className="edit" aria-label={`Step ${i + 1}`} value={s} onChange={(e) => set(i, e.target.value)} />
            )}
            <span className="step-tools">
              <button type="button" className="icon-btn sm" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><IconUp /></button>
              <button type="button" className="icon-btn sm" aria-label={`Move step ${i + 1} down`} disabled={i === steps.length - 1} onClick={() => move(i, 1)}><IconDown /></button>
              <button type="button" className="icon-btn sm" aria-label={`Remove step ${i + 1}`} onClick={() => onChange(steps.filter((_, j) => j !== i))}><IconX /></button>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className={"btn btn-sm btn-ghost" + (isGap ? " gap" : "")} onClick={() => onChange([...steps, ""])}>
        <IconPlus /> Add step
      </button>
    </div>
  );
}
