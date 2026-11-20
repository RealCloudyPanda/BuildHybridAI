export type EngineErrorCode =
  | "device-unavailable"
  | "offline-no-device"
  | "privacy-violation"
  | "app-check"
  | "network"
  | "schema"
  | "parse"
  | "unknown";

export class EngineError extends Error {
  constructor(public code: EngineErrorCode, message?: string, public detail?: string) {
    super(message ?? userMessage(code));
    this.name = "EngineError";
  }
}

export function toEngineError(e: unknown): EngineError {
  if (e instanceof EngineError) return e;
  const err = e as { code?: string; message?: string } | undefined;
  const code = String(err?.code ?? "");
  const msg = String(err?.message ?? e ?? "");
  const detail = code ? `${code}: ${msg}` : msg;
  if (/app.?check|403/i.test(msg)) return new EngineError("app-check", undefined, detail);
  if (code.endsWith("api-not-enabled") || code.endsWith("unsupported")) return new EngineError("device-unavailable", undefined, detail);
  if (code.endsWith("fetch-error")) return new EngineError("network", undefined, detail);
  if (code.endsWith("invalid-schema")) return new EngineError("schema", undefined, detail);
  if (code.endsWith("parse-failed")) return new EngineError("parse", undefined, detail);
  return new EngineError("unknown", undefined, detail);
}

export function userMessage(code: EngineErrorCode): string {
  switch (code) {
    case "device-unavailable":
      return "This browser can't run the on-device model. Set it up, or switch to Hybrid.";
    case "offline-no-device":
      return "You're offline and the on-device model isn't ready, so there is nowhere to run this. Prepare the model or reconnect.";
    case "privacy-violation":
      return "A Local-only run came back from the cloud, so the result was discarded. Nothing is shown.";
    case "app-check":
      return "Firebase rejected the request (App Check). Check the debug token or site key in Settings.";
    case "network":
      return "Couldn't reach Firebase AI Logic. Check your connection, or prepare the on-device model.";
    case "schema":
      return "The model rejected the report format. Try again.";
    case "parse":
      return "The model's reply wasn't a readable report. Try again.";
    default:
      return "Something went wrong while writing the report.";
  }
}
