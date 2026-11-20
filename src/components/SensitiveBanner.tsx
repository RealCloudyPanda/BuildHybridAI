import type { Privacy } from "../domain/types";
import { IconAlert, IconCloud } from "./icons";

interface Props { summary: string; privacy: Privacy }

export function SensitiveBanner({ summary, privacy }: Props) {
  if (!summary) return null;
  if (privacy === "local-only") {
    return (
      <div className="banner" role="status">
        <IconAlert />
        <div>
          <strong>{summary}</strong> Local-only is on, so these notes won't leave this device.
        </div>
      </div>
    );
  }
  return (
    <div className="banner neutral" role="status">
      <IconCloud />
      <div>
        <strong>{summary}</strong> Hybrid chosen. Notes may be sent to the cloud if the on-device model isn't ready.
      </div>
    </div>
  );
}
