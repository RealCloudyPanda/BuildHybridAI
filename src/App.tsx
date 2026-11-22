import { useCallback, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Shell } from "./components/Shell";
import { NotesPane } from "./components/NotesPane";
import { ReportPane } from "./components/ReportPane";
import { DraftsRail } from "./components/DraftsRail";
import { EnginePanel } from "./components/EnginePanel";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { ExportBar } from "./components/ExportBar";
import { Toasts } from "./components/Toast";
import { MissingInfo } from "./components/MissingInfo";
import { E2_EXAMPLE_ANSWERS, FIXTURES } from "./fixtures/examples";
import { loadSettings } from "./store/settings";
import { useDrafts } from "./store/useDrafts";
import { createRuns, type RunState } from "./engine/runs";
import type { Field } from "./domain/report";
import { acceptFlag, editField, removeFlagged, toggleLock } from "./domain/edits";
import { useToasts } from "./hooks/useToasts";
import type { Draft, Flag } from "./domain/types";
import { inventionCheck, sourceTextFor } from "./domain/invention";
import { FlaggedText } from "./components/FlagMark";
import { RoutingLab } from "./components/RoutingLab";
import { EvidenceReview } from "./components/EvidenceReview";
import { InventionSummary } from "./components/InventionSummary";

export default function App() {
  const [settings] = useState(loadSettings);
  const live = !!settings.firebaseConfig;
  const { drafts, active, activeId, setActiveId, update, create, remove } = useDrafts();
  const [railOpen, setRailOpen] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toasts, toast } = useToasts();
  const [tab, setTab] = useState<"notes" | "report">("notes");
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const runner = useMemo(() => createRuns(settings, {
    update,
    changed: (id, state) => setRuns((current) => ({ ...current, [id]: state })),
  }), [settings, update]);
  const run = useCallback(async (draft: Draft, answers = draft.answers) => {
    setTab("report");
    if (await runner.run(draft, answers) === "stale") {
      toast("Inputs changed during the run. Run again to refresh the report.");
    }
  }, [runner, toast]);

  const flags = useMemo(
    () => (active?.report ? inventionCheck(active.report, sourceTextFor(active), active.acceptedFlags) : []),
    [active],
  );

  if (!active) return null;

  const questions = active.report?.missing_info ?? [];
  const exampleQuestions = FIXTURES.vague.missing_info;
  const showExampleFill = !live && active.exampleId === "vague" && questions.length > 0;
  const sampleAnswers = questions.map((q) => {
    const index = exampleQuestions.findIndex((x) => x.field === q.field);
    return index >= 0 ? E2_EXAMPLE_ANSWERS[index] : "Not sure";
  });

  const removeFlag = (f: Flag) => update(active.id, (d) => ({ report: removeFlagged(d.report, f) }));
  const keepFlag = (f: Flag) => update(active.id, (d) => ({ acceptedFlags: acceptFlag(d.acceptedFlags, f) }));
  const renderPreview = (field: Field, index?: number) => {
    const fs = flags.filter((f) => f.field === field && f.index === index);
    if (!fs.length || !active.report) return undefined;
    const v = active.report[field];
    const text = Array.isArray(v) ? v[index ?? 0] : v;
    const body = <FlaggedText text={text} flags={fs} onRemove={removeFlag} onKeep={keepFlag} />;
    return field === "environment" ? <span>{body}</span> : <div className={"preview-line" + (field === "title" ? " title-input" : "")}>{body}</div>;
  };
  const simulate = () =>
    update(active.id, (d) => (d.report ? { report: { ...d.report, environment: [...d.report.environment, "Chrome 131"] } } : {}));

  const onEdit = (field: Field, value: string | string[]) => update(active.id, (d) => editField(d.report, d.locked, field, value));
  const onToggleLock = (f: Field) => update(active.id, (d) => ({ locked: toggleLock(d.locked, f) }));

  return (
    <>
      <Header
        live={live}
        deviceChip={<EnginePanel live={live} settings={settings} lastRun={active.lastRun} open={engineOpen} onToggle={() => setEngineOpen((o) => !o)} onClose={() => setEngineOpen(false)} />}
        onOpenSettings={() => setSettingsOpen(true)} onToggleRail={() => setRailOpen((o) => !o)} />
      <Shell
        rail={
          <DraftsRail
            drafts={drafts}
            activeId={activeId}
            open={railOpen}
            onClose={() => setRailOpen(false)}
            onSelect={(id) => { setActiveId(id); setRailOpen(false); setTab("notes"); }}
            onNew={() => { create(); setRailOpen(false); setTab("notes"); }}
            onDelete={(id) => void remove(id)}
          />
        }
        notes={<NotesPane draft={active} running={!!runs[active.id]?.running} onChange={(p) => update(active.id, p)} onRun={() => run(active)} />}
        report={
          <ReportPane
            draft={active}
            running={runs[active.id]?.running ?? null}
            error={runs[active.id]?.error ?? null}
            onEdit={onEdit}
            onToggleLock={onToggleLock}
            onOpenEngine={() => setEngineOpen(true)}
            onRetry={() => run(active)}
            onSwitchHybrid={() => update(active.id, { privacy: "hybrid", privacyOverride: true })}
            renderPreview={renderPreview}
            summary={<InventionSummary count={flags.length} onSimulate={!live ? simulate : undefined} />}
            below={
              <><RoutingLab /><EvidenceReview draft={active} /><MissingInfo
                key={`${active.id}:${active.lastRun?.at ?? ""}`}
                draft={active}
                running={!!runs[active.id]?.running}
                showExampleFill={showExampleFill}
                exampleAnswers={sampleAnswers}
                onSubmit={(answers) => run(active, answers)}
              /></>
            }
            footer={
              active.report && <ExportBar report={active.report} source={active.lastRun?.source} onCopied={toast} />
            }
          />
        }
        tab={tab}
        onTab={setTab}
        showReportTab={!!active.report || !!runs[active.id]?.running || !!runs[active.id]?.error}
      />
      <Toasts items={toasts} />
      {settingsOpen && <SettingsDrawer settings={settings} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
