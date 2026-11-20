import type { Availability, Source } from "../domain/types";
import { IconCloud, IconDevice, IconSample } from "./icons";

export function whyCloud(a: Availability | null): string {
  switch (a) {
    case "downloadable":
      return "On-device model not downloaded yet. Press Prepare.";
    case "downloading":
      return "On-device model still downloading.";
    case "available":
      return "Chrome declined the on-device request, so it ran in the cloud.";
    default:
      return "This browser can't run the on-device model.";
  }
}

const LABEL: Record<Source, string> = { on_device: "On device", in_cloud: "In cloud", sample: "Sample · no AI" };

export function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

export function SourceBadge({ source, ms, availabilityBefore }: { source: Source; ms: number; availabilityBefore: Availability | null }) {
  const Icon = source === "on_device" ? IconDevice : source === "in_cloud" ? IconCloud : IconSample;
  const title =
    source === "in_cloud"
      ? whyCloud(availabilityBefore)
      : source === "on_device"
        ? "Ran with Gemini Nano in this browser (inferenceSource: on_device)."
        : "Written by the rule-based sample engine. No AI was used.";
  return (
    <span className={`badge badge-${source}`} title={title} key={source}>
      <Icon /> {LABEL[source]} · <span className="num">{formatMs(ms)}</span>
    </span>
  );
}
