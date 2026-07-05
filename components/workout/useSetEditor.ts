import { useEffect, useRef, useState, useTransition } from "react";

import { markSetDone, updateWorkoutSet } from "@/app/actions/workouts";
import type { FlatSetRow } from "@/components/workout/groupSets";
import { isSetReadyToComplete } from "@/lib/setCompletion";
import { parseOptionalNumber } from "@/lib/parse";
import { useCountdown } from "@/lib/useCountdown";
import { computeSetVolume } from "@/lib/volume";

/**
 * Shared editing/completion logic for a single set, used by both the List
 * (`SetTableRow`) and Focus (`FocusSetCard`) views so behavior — debounced
 * autosave, timed countdown, and the Done button gate — stays in sync (#72, #73).
 */
export function useSetEditor({
  row,
  bodyWeight,
  readOnly,
  onDoneRest,
}: {
  row: FlatSetRow;
  bodyWeight: number | null;
  readOnly?: boolean;
  /** Called right when a set is successfully marked Done, so the parent can start rest. */
  onDoneRest?: () => void;
}) {
  const [reps, setReps] = useState(() => row.reps?.toString() ?? "");
  const [weight, setWeight] = useState(() => row.weight?.toString() ?? "");
  const [rir, setRir] = useState(() => row.rir?.toString() ?? "");
  const [duration, setDuration] = useState(
    () => row.duration_seconds?.toString() ?? "",
  );

  const [markDonePending, startMarkDone] = useTransition();
  const [markDoneError, setMarkDoneError] = useState<string | null>(null);
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);
  const timerSecondsRef = useRef<number>(0);

  const skipSave = useRef(true);

  const isDone = row.completed_at != null;

  const volumeLocal = computeSetVolume(row.tracking_type, {
    reps: parseOptionalNumber(reps),
    weight: parseOptionalNumber(weight),
    durationSeconds: parseOptionalNumber(duration),
    bodyWeight,
  });

  const readyToComplete = isSetReadyToComplete({
    tracking_type: row.tracking_type,
    reps: parseOptionalNumber(reps),
    weight: parseOptionalNumber(weight),
    rir: parseOptionalNumber(rir),
    duration_seconds: parseOptionalNumber(duration),
  });

  // Debounced DB save — only persists values, no timer/completion logic here.
  useEffect(() => {
    if (readOnly) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      void updateWorkoutSet({
        id: row.id,
        reps: parseOptionalNumber(reps),
        weight: parseOptionalNumber(weight),
        rir: parseOptionalNumber(rir),
        duration_seconds: parseOptionalNumber(duration),
      }).catch(() => {
        // Error handling is done at the parent level
      });
    }, 500);
    return () => clearTimeout(t);
  }, [readOnly, row.id, reps, weight, rir, duration]);

  const handleMarkDone = () => {
    setMarkDoneError(null);
    startMarkDone(async () => {
      try {
        await markSetDone(row.id);
        onDoneRest?.();
      } catch (err) {
        setMarkDoneError(
          err instanceof Error ? err.message : "Could not mark set done",
        );
      }
    });
  };

  /** Start an inline countdown for timed exercises; auto-fills duration on completion. */
  const startTimer = (seconds: number) => {
    if (seconds <= 0) return;
    timerSecondsRef.current = seconds;
    setTimerEndAt(Date.now() + seconds * 1000);
  };

  const timerRemaining = useCountdown(timerEndAt);

  // When the countdown reaches zero, auto-fill duration with the target
  // time (can't be derived during render, so this runs in an effect).
  useEffect(() => {
    if (timerEndAt == null) return;
    if (timerRemaining > 0) return;
    setDuration(String(timerSecondsRef.current));
    setTimerEndAt(null);
  }, [timerRemaining, timerEndAt]);

  return {
    reps,
    setReps,
    weight,
    setWeight,
    rir,
    setRir,
    duration,
    setDuration,
    volumeLocal,
    isDone,
    readyToComplete,
    markDonePending,
    markDoneError,
    handleMarkDone,
    timerEndAt,
    setTimerEndAt,
    timerRemaining,
    startTimer,
  };
}
