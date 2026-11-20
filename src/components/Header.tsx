import type { ReactNode } from "react";
import { IconExternal, IconMenu, IconSettings } from "./icons";

interface Props {
  live: boolean;
  deviceChip: ReactNode;
  offlineChip?: ReactNode;
  onOpenSettings: () => void;
  onToggleRail: () => void;
}

export function Header({ live, deviceChip, offlineChip, onOpenSettings, onToggleRail }: Props) {
  return (
    <header className="hdr">
      <button type="button" className="icon-btn rail-toggle" aria-label="Show drafts" onClick={onToggleRail}>
        <IconMenu />
      </button>
      <div className="wordmark" aria-label="Repro Offline">
        <img src="/favicon.svg" alt="" />
        <span>
          repro<span className="off">offline</span>
        </span>
      </div>
      {live ? (
        <span className="chip chip-live" title="A Firebase config is set. Runs use Firebase AI Logic.">
          <span className="dot" /> Live
        </span>
      ) : (
        <span className="chip chip-sample" title="No Firebase config. Reports come from a rule-based engine with no AI.">
          Sample mode: no AI
        </span>
      )}
      {deviceChip}
      {offlineChip}
      <span className="hdr-spacer" />
      <a className="hdr-link hide-sm" href="/demo-shop/index.html" target="_blank" rel="noopener">
        Demo shop <IconExternal width={12} height={12} style={{ verticalAlign: "-1px" }} />
      </a>
      <button type="button" className="icon-btn" aria-label="Settings" onClick={onOpenSettings}>
        <IconSettings />
      </button>
    </header>
  );
}
