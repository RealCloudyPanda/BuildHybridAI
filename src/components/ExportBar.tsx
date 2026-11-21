import { useState } from "react";
import type { Report } from "../domain/report";
import type { Source } from "../domain/types";
import { toMarkdown, toPlainText } from "../domain/markdown";
import { labelsFor, scanSensitive, joinList } from "../domain/sensitivity";
import { downloadMarkdown } from "../domain/download";
import { IconCopy } from "./icons";

type Kind = "md" | "text" | "download";

export function ExportBar({ report, source, onCopied }: { report: Report; source?: Source; onCopied: (msg: string) => void }) {
  const [confirm, setConfirm] = useState<{ kind: Kind; labels: string[] } | null>(null);
  const textFor = (k: Kind) => (k !== "text" ? toMarkdown(report, source) : toPlainText(report, source));
  const copy = async (k: Kind) => {
    setConfirm(null);
    try {
      if (k === "download") { downloadMarkdown(textFor(k)); onCopied("Markdown downloaded"); return; }
      await navigator.clipboard.writeText(textFor(k));
      onCopied(k === "md" ? "Copied as Markdown" : "Copied as text");
    } catch {
      downloadMarkdown(toMarkdown(report, source));
      onCopied("Clipboard unavailable. Markdown downloaded instead.");
    }
  };
  const start = (k: Kind) => {
    const labels = labelsFor(scanSensitive(textFor(k)));
    if (labels.length) setConfirm({ kind: k, labels });
    else void copy(k);
  };
  return (
    <div className="export">
      <button type="button" className="btn btn-sm" onClick={() => start("md")}><IconCopy /> Copy as Markdown</button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => start("text")}>Copy as text</button>
      <button type="button" className="btn btn-sm" onClick={() => start("download")}>Download Markdown</button>
      {confirm && (
        <div className="confirm-pop" role="alertdialog" aria-label="Sensitive details">
          <p>This report includes {joinList(confirm.labels)}. Export anyway?</p>
          <div className="row">
            <button type="button" className="btn btn-sm btn-primary" autoFocus onClick={() => copy(confirm.kind)}>Export anyway</button>
            <button type="button" className="btn btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
