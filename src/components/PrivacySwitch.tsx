import type { KeyboardEvent } from "react";
import type { Privacy } from "../domain/types";
import { IconCloud, IconShield } from "./icons";

interface Props { value: Privacy; onChange: (p: Privacy) => void }

const OPTIONS: { value: Privacy; label: string; icon: typeof IconShield }[] = [
  { value: "hybrid", label: "Hybrid", icon: IconCloud },
  { value: "local-only", label: "Local-only", icon: IconShield },
];

export const PRIVACY_DESC: Record<Privacy, string> = {
  hybrid: "Runs on this device when the on-device model is ready, otherwise in the cloud.",
  "local-only": "Runs only on this device. If that isn't possible you'll see an error. Never uses the cloud.",
};

export function PrivacySwitch({ value, onChange }: Props) {
  const onKey = (e: KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const next = value === "hybrid" ? "local-only" : "hybrid";
      onChange(next);
      requestAnimationFrame(() =>
        (document.querySelector(`[data-privacy="${next}"]`) as HTMLButtonElement | null)?.focus(),
      );
    }
  };
  return (
    <div className="privacy">
      <span className="privacy-label" id="privacy-label">Privacy</span>
      <div className="seg" role="radiogroup" aria-labelledby="privacy-label" data-value={value} onKeyDown={onKey}>
        <span className="seg-thumb" aria-hidden="true" />
        {OPTIONS.map(({ value: v, label, icon: Icon }) => (
          <button
            key={v}
            type="button"
            role="radio"
            data-privacy={v}
            aria-checked={value === v}
            tabIndex={value === v ? 0 : -1}
            onClick={() => onChange(v)}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>
      <p className="privacy-desc">{PRIVACY_DESC[value]}</p>
    </div>
  );
}
