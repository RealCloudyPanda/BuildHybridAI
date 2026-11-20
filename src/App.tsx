import { useState } from "react";
import { Header } from "./components/Header";
import { Shell } from "./components/Shell";
import { loadSettings } from "./store/settings";

export default function App() {
  const [settings] = useState(loadSettings);
  const [tab, setTab] = useState<"notes" | "report">("notes");
  return (
    <>
      <Header live={!!settings.firebaseConfig} deviceChip={null} onOpenSettings={() => {}} onToggleRail={() => {}} />
      <Shell
        rail={<aside className="rail" aria-label="Drafts" />}
        notes={<h2 className="pane-title">Notes</h2>}
        report={<h2 className="pane-title">Report</h2>}
        tab={tab}
        onTab={setTab}
        showReportTab={false}
      />
    </>
  );
}
