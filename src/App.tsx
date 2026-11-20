import { useCallback, useState } from "react";
import { Header } from "./components/Header";
import { Shell } from "./components/Shell";
import { NotesPane } from "./components/NotesPane";
import { ReportPane, type Running } from "./components/ReportPane";
import { loadSettings } from "./store/settings";
import { useDrafts } from "./store/useDrafts";
import { runEngine } from "./engine/run";
import { EngineError, toEngineError } from "./engine/errors";
import { emptyReport, type Field } from "./domain/report";
import type { Draft } from "./domain/types";

export default function App() {
  const [settings] = useState(loadSettings);
  const live = !!settings.firebaseConfig;
  const { active, update } = useDrafts();
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

  if (!active) return null;

  const onEdit = (field: Field, value: string | string[]) =>
    update(active.id, (d) => ({
      report: { ...(d.report ?? emptyReport()), [field]: value },
      locked: d.locked.includes(field) ? d.locked : [...d.locked, field],
    }));
  const onToggleLock = (f: Field) =>
    update(active.id, (d) => ({ locked: d.locked.includes(f) ? d.locked.filter((x) => x !== f) : [...d.locked, f] }));

  return (
    <>
      <Header live={live} deviceChip={null} onOpenSettings={() => {}} onToggleRail={() => {}} />
      <Shell
        rail={<aside className="rail" aria-label="Drafts" />}
        notes={<NotesPane draft={active} running={!!running[active.id]} onChange={(p) => update(active.id, p)} onRun={() => run(active)} />}
        report={
          <ReportPane
            draft={active}
            running={running[active.id] ?? null}
            error={errors[active.id] ?? null}
            onEdit={onEdit}
            onToggleLock={onToggleLock}
            onOpenEngine={() => {}}
            onRetry={() => run(active)}
            onSwitchHybrid={() => update(active.id, { privacy: "hybrid", privacyOverride: true })}
          />
        }
        tab={tab}
        onTab={setTab}
        showReportTab={!!active.report || !!running[active.id]}
      />
    </>
  );
}
