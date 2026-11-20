export function Toasts({ items }: { items: { id: number; text: string }[] }) {
  return (
    <div className="toasts" aria-live="polite" role="status">
      {items.map((t) => <div className="toast" key={t.id}>{t.text}</div>)}
    </div>
  );
}
