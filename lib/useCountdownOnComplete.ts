import { useEffect, useRef } from "react";

import { useCountdown } from "@/lib/useCountdown";

/**
 * Countdown that invokes `onComplete` once when remaining time reaches zero.
 * Guards against firing on the first render before any tick has occurred.
 */
export function useCountdownOnComplete(
  endAt: number | null,
  onComplete: () => void,
): number {
  const remaining = useCountdown(endAt);
  const wasActiveRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (endAt == null) {
      wasActiveRef.current = false;
      return;
    }
    if (remaining > 0) {
      wasActiveRef.current = true;
      return;
    }
    if (!wasActiveRef.current) return;
    wasActiveRef.current = false;
    onCompleteRef.current();
  }, [remaining, endAt]);

  return remaining;
}
