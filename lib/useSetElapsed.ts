import { useEffect, useState } from "react";

import { setElapsedSeconds } from "@/lib/duration";

function elapsedSinceStartMs(startMs: number | null, nowMs: number): number {
  if (startMs == null) return 0;
  return Math.max(0, Math.floor((nowMs - startMs) / 1000));
}

/** Live or final per-set elapsed time from started_at (and completed_at when done). */
export function useSetElapsed(
  startedAt: string | null,
  completedAt: string | null,
): number | null {
  const startMs = startedAt != null ? new Date(startedAt).getTime() : null;
  const completedMs =
    completedAt != null ? new Date(completedAt).getTime() : null;
  const isLive = startMs != null && completedMs == null;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isLive) return;
    const tick = () => setNowMs(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [isLive, startMs]);

  if (startMs == null) return null;
  if (completedMs != null) {
    return setElapsedSeconds(startedAt, completedAt);
  }
  return elapsedSinceStartMs(startMs, nowMs);
}
