import { IconAlert, IconCheck } from "./icons";

interface Props { count: number; onSimulate?: () => void }

export function InventionSummary({ count, onSimulate }: Props) {
  return (
    <>
      <span className={"check-line" + (count ? " has" : "")}>
        {count ? <IconAlert /> : <IconCheck />}
        {count === 0
          ? "Invention check: nothing added"
          : `Invention check: ${count === 1 ? "1 detail" : `${count} details`} not in your notes`}
      </span>
      {onSimulate && count === 0 && (
        <button type="button" className="link-btn" onClick={onSimulate} title="Sample mode only: adds “Chrome 131” to the environment so you can see a flag.">
          Simulate a made-up detail
        </button>
      )}
    </>
  );
}
