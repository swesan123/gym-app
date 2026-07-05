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
 */
export function useCountdown(endAt: number | null): number {
  const [remaining, setRemaining] = useState(() => secondsUntil(endAt));

  useEffect(() => {
    const tick = () => setRemaining(secondsUntil(endAt));
    // Resync immediately when `endAt` changes — the previous render's value
    // is for the old target and must not be shown even for one frame.
    tick();
    if (endAt == null) return;

    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [endAt]);

  return endAt == null ? 0 : remaining;
}
