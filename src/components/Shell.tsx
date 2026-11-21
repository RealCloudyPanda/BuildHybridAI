import type { ReactNode } from "react";

interface Props {
  rail: ReactNode;
  notes: ReactNode;
  report: ReactNode;
  tab: "notes" | "report";
  onTab: (t: "notes" | "report") => void;
  showReportTab: boolean;
}

export function Shell({ rail, notes, report, tab, onTab, showReportTab }: Props) {
  return (
    <>
      {showReportTab && (
        <div className="mobile-tabs" role="tablist" aria-label="Panes">
          <button role="tab" aria-selected={tab === "notes"} onClick={() => onTab("notes")}>Notes</button>
          <button role="tab" aria-selected={tab === "report"} onClick={() => onTab("report")}>Report</button>
        </div>
      )}
      <div className="shell" data-tab={showReportTab ? tab : "notes"}>
        {rail}
        <section className="pane pane-notes" aria-label="Notes">{notes}</section>
        <section className="pane pane-report" aria-label="Report" aria-live="polite">{report}</section>
      </div>
    </>
  );
}
