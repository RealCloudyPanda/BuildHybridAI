import type { ReactNode } from "react";
import type { Field } from "../domain/report";
import { IconLock, IconUnlock } from "./icons";

interface LockProps { field: Field; locked: boolean; onToggle: (f: Field) => void }

export function LockButton({ field, locked, onToggle }: LockProps) {
  return (
    <button
      type="button"
      className="icon-btn sm lock-btn"
      aria-pressed={locked}
      aria-label={locked ? `Locked: kept on re-run (${field})` : `Lock ${field} so re-runs keep it`}
      title={locked ? "Locked: kept on re-run. Click to unlock." : "Lock this field"}
      onClick={() => onToggle(field)}
    >
      {locked ? <IconLock /> : <IconUnlock />}
    </button>
  );
}

interface Props {
  field: Field;
  label: string;
  value: string;
  locked: boolean;
  index: number;
  onChange: (v: string) => void;
  onToggleLock: (f: Field) => void;
  big?: boolean;
  preview?: ReactNode;
}

export function EditableField({ field, label, value, locked, index, onChange, onToggleLock, big, preview }: Props) {
  const id = `f-${field}`;
  const isGap = !value.trim();
  return (
    <div className="field" style={{ ["--i" as string]: index }}>
      <div className="field-head">
        <label className="field-label" htmlFor={id}>{label}</label>
        {isGap && <span className="gap-tag">Needs info</span>}
        <LockButton field={field} locked={locked} onToggle={onToggleLock} />
      </div>
      {preview ?? (
        <textarea
          id={id}
          rows={1}
          className={(big ? "title-input" : "edit") + (isGap ? " gap" : "")}
          value={value}
          placeholder={isGap ? "Needs info: not in your notes yet" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
