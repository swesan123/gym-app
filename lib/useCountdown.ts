import { useEffect, useState } from "react";

function secondsUntil(endAt: number | null): number {
  if (endAt == null) return 0;
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

/**
 * Timestamp-based countdown that survives tab backgrounding/throttling
 * (#67): remaining time is always recomputed from an absolute `endAt`
 * epoch rather than decremented tick-by-tick, so drift or a suspended
 * `setInterval` while the tab is hidden cannot desync the displayed time.
 *
 * The returned value is derived synchronously from `endAt` on every render
 * (not read from state) so that the very first render after `endAt` flips
 * from `null` to a future timestamp already reflects the correct remaining
 * time — state updates only exist to force re-renders as time passes.
 */
export function useCountdown(endAt: number | null): number {
  const [, bump] = useState(0);

  useEffect(() => {
    if (endAt == null) return;
    const tick = () => bump((n) => n + 1);
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [endAt]);

  return secondsUntil(endAt);
}
