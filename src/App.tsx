import { useCallback, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Shell } from "./components/Shell";
import { NotesPane } from "./components/NotesPane";
import { ReportPane, type Running } from "./components/ReportPane";
import { DraftsRail } from "./components/DraftsRail";
import { EnginePanel } from "./components/EnginePanel";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { MissingInfo } from "./components/MissingInfo";
import { E2_EXAMPLE_ANSWERS } from "./fixtures/examples";
import { loadSettings } from "./store/settings";
import { useDrafts } from "./store/useDrafts";
import { runEngine } from "./engine/run";
import { EngineError, toEngineError } from "./engine/errors";
import { emptyReport, type Field } from "./domain/report";
import type { Draft, Flag } from "./domain/types";
import { inventionCheck, sourceTextFor } from "./domain/invention";
import { FlaggedText } from "./components/FlagMark";
import { InventionSummary } from "./components/InventionSummary";

export default function App() {
  const [settings] = useState(loadSettings);
  const live = !!settings.firebaseConfig;
  const { drafts, active, activeId, setActiveId, update, create, remove } = useDrafts();
  const [railOpen, setRailOpen] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<"notes" | "report">("notes");
  const [running, setRunning] = useState<Record<string, Running>>({});
  const [errors, setErrors] = useState<Record<string, EngineError | null>>({});

  const run = useCallback(
    async (d: Draft, answers = d.answers) => {
      const id = d.id;
      setRunning((r) => ({ ...r, [id]: { startedAt: Date.now(), privacy: d.privacy, live } }));
      setErrors((e) => ({ ...e, [id]: null }));
      setTab("report");
      try {
        const res = await runEngine(
          { notes: d.notes, answers, exampleId: d.exampleId, locked: d.locked, report: d.report },
          d.privacy,
          settings,
        );
        update(id, {
          answers,
          report: res.report,
          lastRun: { source: res.source, ms: res.ms, availabilityBefore: res.availabilityBefore, at: Date.now(), privacy: d.privacy },
        });
      } catch (e) {
        setErrors((x) => ({ ...x, [id]: toEngineError(e) }));
      } finally {
        setRunning((r) => {
          const { [id]: _, ...rest } = r;
          return rest;
        });
      }
    },
    [live, settings, update],
  );

  const flags = useMemo(
    () => (active?.report ? inventionCheck(active.report, sourceTextFor(active), active.acceptedFlags) : []),
    [active],
  );

  if (!active) return null;

  const removeFlag = (f: Flag) =>
    update(active.id, (d) => {
      const r = d.report ?? emptyReport();
      const strip = (s: string) => s.replace(new RegExp(f.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();
      let next = { ...r };
      if (f.field === "environment" && f.index !== undefined) next.environment = r.environment.filter((_, i) => i !== f.index);
      else if (f.field === "steps" && f.index !== undefined) next.steps = r.steps.map((s, i) => (i === f.index ? strip(s) : s));
      else if (f.field === "title" || f.field === "expected" || f.field === "actual") next = { ...next, [f.field]: strip(r[f.field]) };
      return { report: next };
    });
  const keepFlag = (f: Flag) =>
    update(active.id, (d) => ({ acceptedFlags: [...new Set([...d.acceptedFlags, f.text.toLowerCase()])] }));
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

  const onEdit = (field: Field, value: string | string[]) =>
    update(active.id, (d) => ({
      report: { ...(d.report ?? emptyReport()), [field]: value },
      locked: d.locked.includes(field) ? d.locked : [...d.locked, field],
    }));
  const onToggleLock = (f: Field) =>
    update(active.id, (d) => ({ locked: d.locked.includes(f) ? d.locked.filter((x) => x !== f) : [...d.locked, f] }));

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
        notes={<NotesPane draft={active} running={!!running[active.id]} onChange={(p) => update(active.id, p)} onRun={() => run(active)} />}
        report={
          <ReportPane
            draft={active}
            running={running[active.id] ?? null}
            error={errors[active.id] ?? null}
            onEdit={onEdit}
            onToggleLock={onToggleLock}
            onOpenEngine={() => setEngineOpen(true)}
            onRetry={() => run(active)}
            onSwitchHybrid={() => update(active.id, { privacy: "hybrid", privacyOverride: true })}
            renderPreview={renderPreview}
            summary={<InventionSummary count={flags.length} onSimulate={!live ? simulate : undefined} />}
            below={
              <MissingInfo
                draft={active}
                running={!!running[active.id]}
                showExampleFill={!live && active.exampleId === "vague"}
                exampleAnswers={E2_EXAMPLE_ANSWERS}
                onSubmit={(answers) => run(active, answers)}
              />
            }
          />
        }
        tab={tab}
        onTab={setTab}
        showReportTab={!!active.report || !!running[active.id]}
      />
      {settingsOpen && <SettingsDrawer settings={settings} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
