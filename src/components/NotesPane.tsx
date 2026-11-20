import { useEffect, useMemo, useState } from "react";
import type { Draft, Privacy } from "../domain/types";
import { NOTES_CHAR_LIMIT } from "../domain/prompt";
import { scanSensitive, summarise } from "../domain/sensitivity";
import { EXAMPLES, type Example } from "../fixtures/examples";
import { HighlightedTextarea } from "./HighlightedTextarea";
import { PrivacySwitch } from "./PrivacySwitch";
import { SensitiveBanner } from "./SensitiveBanner";

interface Props {
  draft: Draft;
  running: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onRun: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function NotesPane({ draft, running, onChange, onRun }: Props) {
  // The scan follows the notes with a 300 ms debounce while typing.
  const [scanText, setScanText] = useState(draft.notes);
  useEffect(() => {
    if (scanText === draft.notes) return;
    const t = setTimeout(() => setScanText(draft.notes), 300);
    return () => clearTimeout(t);
  }, [draft.notes, scanText]);
  useEffect(() => setScanText(draft.notes), [draft.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(() => scanSensitive(scanText), [scanText]);
  const visibleMatches = scanText === draft.notes ? matches : [];
  const summary = summarise(visibleMatches);

  // F4: first sensitive match in a draft switches it to Local-only, unless the tester chose Hybrid.
  useEffect(() => {
    if (visibleMatches.length && draft.privacy === "hybrid" && !draft.privacyOverride) onChange({ privacy: "local-only" });
  }, [visibleMatches.length, draft.id, draft.privacy, draft.privacyOverride, onChange]);

  const len = draft.notes.length;
  const over = len > NOTES_CHAR_LIMIT;
  const empty = !draft.notes.trim();

  const setNotes = (notes: string) => {
    const ex = draft.exampleId && EXAMPLES.find((e) => e.id === draft.exampleId);
    onChange({ notes, exampleId: ex && ex.notes === notes ? draft.exampleId : undefined });
  };
  const useExample = (e: Example) => {
    const sensitive = scanSensitive(e.notes).length > 0;
    setScanText(e.notes);
    onChange({ notes: e.notes, exampleId: e.id, privacy: sensitive ? "local-only" : draft.privacy, privacyOverride: false });
  };
  const setPrivacy = (p: Privacy) => onChange({
    privacy: p,
    privacyOverride: p === "hybrid" && (draft.privacyOverride || draft.privacy === "local-only" || scanSensitive(draft.notes).length > 0),
  });

  return (
    <>
      <h2 className="pane-title"><label htmlFor="notes">Notes</label></h2>
      <HighlightedTextarea
        id="notes"
        value={draft.notes}
        matches={visibleMatches}
        over={over}
        onChange={setNotes}
        onSubmit={() => !empty && !over && !running && onRun()}
        counter={`${len.toLocaleString("en-US")} / ${NOTES_CHAR_LIMIT.toLocaleString("en-US")}`}
        describedBy={over ? "over-hint" : undefined}
      />
      {over && <p className="over-hint" id="over-hint">Shorten to 4,000 characters for the on-device model.</p>}
      {empty && (
        <div className="examples">
          <p>No notes handy? Try one:</p>
          <div className="example-chips">
            {EXAMPLES.map((e) => (
              <button key={e.id} type="button" className="example-chip" onClick={() => useExample(e)}>{e.label}</button>
            ))}
          </div>
        </div>
      )}
      <SensitiveBanner summary={summary} privacy={draft.privacy} />
      <PrivacySwitch value={draft.privacy} onChange={setPrivacy} />
      <div className="notes-actions">
        <button type="button" className="btn btn-primary" disabled={empty || over || running} onClick={onRun}>
          Write report <kbd aria-hidden="true">{isMac ? "⌘↵" : "Ctrl+↵"}</kbd>
        </button>
      </div>
    </>
  );
}
