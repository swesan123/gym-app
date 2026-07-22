import { useEffect, useState } from "react";

function secondsSince(startAt: number | null): number {
  if (startAt == null) return 0;
  return Math.max(0, Math.floor((Date.now() - startAt) / 1000));
}

/**
 * Live elapsed-time counter for the active workout header (#94), using the
 * same absolute-timestamp pattern as `useCountdown` (#67) so the displayed
 * time is always recomputed from `startAt` rather than drifting from
 * tick-by-tick increments while the tab is backgrounded.
 */
export function useWorkoutElapsed(startAt: number | null): number {
  const [, bump] = useState(0);

  useEffect(() => {
    if (startAt == null) return;
    const tick = () => bump((n) => n + 1);
    const id = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [startAt]);

  return secondsSince(startAt);
}
