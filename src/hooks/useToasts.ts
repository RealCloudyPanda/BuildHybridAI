import { useCallback, useState } from "react";

export interface ToastItem {
  id: number;
  text: string;
}

export function useToasts(durationMs = 2400) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), durationMs);
  }, [durationMs]);
  return { toasts, toast };
}
