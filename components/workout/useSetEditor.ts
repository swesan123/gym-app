import { useEffect, useRef, useState, useTransition } from "react";

import {
  clearSetDone,
  markSetDone,
  markSetStarted,
  updateWorkoutSet,
} from "@/app/actions/workouts";
import type { FlatSetRow } from "@/components/workout/groupSets";
import { isSetReadyToMarkDone } from "@/lib/setCompletion";
import { parseOptionalNumber } from "@/lib/parse";
import { useCountdownOnComplete } from "@/lib/useCountdownOnComplete";
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
  onSetCompleted,
  onSetStarted,
  onSetFieldsChange,
}: {
  row: FlatSetRow;
  bodyWeight: number | null;
  readOnly?: boolean;
  /** Called right when a set is successfully marked Done, so the parent can start rest. */
  onDoneRest?: () => void;
  /** Called so the parent can optimistically update localRows with the completion timestamp. */
  onSetCompleted?: (setId: string, completedAt: string | null) => void;
  /** Called when the user taps Start (or rest auto-starts the next set). */
  onSetStarted?: (setId: string, startedAt: string | null) => void;
  /** Called on every field edit so the parent's localRows stays current — keeps
   * List and Focus views showing the same values when the user switches between them (#72). */
  onSetFieldsChange?: (
    setId: string,
    fields: {
      reps: number | null;
      weight: number | null;
      rir: number | null;
      duration_seconds: number | null;
    },
  ) => void;
}) {
  const [reps, setReps] = useState(() => row.reps?.toString() ?? "");
  const [weight, setWeight] = useState(() => row.weight?.toString() ?? "");
  const [rir, setRir] = useState(() => row.rir?.toString() ?? "");
  const [duration, setDuration] = useState(
    () => row.duration_seconds?.toString() ?? "",
  );

  // Track completion optimistically so the UI updates immediately without
  // waiting for a full server revalidation cycle.
  const [localCompletedAt, setLocalCompletedAt] = useState<string | null>(
    () => row.completed_at,
  );

  // If the server reconciles a different completed_at value (e.g. after router.refresh),
  // adopt it. The eslint rule discourages this pattern but here it is a deliberate
  // one-time sync whenever the prop changes identity, not a cascading update.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLocalCompletedAt(row.completed_at); }, [row.completed_at]);

  const [localStartedAt, setLocalStartedAt] = useState<string | null>(
    () => row.started_at,
  );

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLocalStartedAt(row.started_at); }, [row.started_at]);

  const [markDonePending, startMarkDone] = useTransition();
  const [clearDonePending, startClearDone] = useTransition();
  const [startPending, startStartSet] = useTransition();
  const [markDoneError, setMarkDoneError] = useState<string | null>(null);
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);
  const timerSecondsRef = useRef<number>(0);

  const skipSave = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDone = localCompletedAt != null;
  const startedAt = localStartedAt ?? row.started_at;
  const hasStarted = startedAt != null;

  const volumeLocal = computeSetVolume(row.tracking_type, {
    reps: parseOptionalNumber(reps),
    weight: parseOptionalNumber(weight),
    durationSeconds: parseOptionalNumber(duration),
    bodyWeight,
  });

  const readyToComplete = isSetReadyToMarkDone({
    tracking_type: row.tracking_type,
    stretch_kind: row.stretch_kind,
    reps: parseOptionalNumber(reps),
    weight: parseOptionalNumber(weight),
    rir: parseOptionalNumber(rir),
    duration_seconds: parseOptionalNumber(duration),
    started_at: startedAt,
  });

  // Debounced DB save — also pushes the current values to the parent's
  // localRows immediately (not debounced) so switching between List and
  // Focus view shows the same values mid-edit (#72).
  useEffect(() => {
    if (readOnly) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const parsed = {
      reps: parseOptionalNumber(reps),
      weight: parseOptionalNumber(weight),
      rir: parseOptionalNumber(rir),
      duration_seconds: parseOptionalNumber(duration),
    };
    onSetFieldsChange?.(row.id, parsed);
    const t = setTimeout(() => {
      saveTimeoutRef.current = null;
      void updateWorkoutSet({ id: row.id, ...parsed }).catch(() => {
        // Error handling is done at the parent level
      });
    }, 500);
    saveTimeoutRef.current = t;
    return () => clearTimeout(t);
  }, [readOnly, row.id, reps, weight, rir, duration, onSetFieldsChange]);

  const handleStartSet = () => {
    if (readOnly || hasStarted) return;
    const optimisticTs = new Date().toISOString();
    setLocalStartedAt(optimisticTs);
    onSetStarted?.(row.id, optimisticTs);
    startStartSet(async () => {
      try {
        const { startedAt: serverStartedAt } = await markSetStarted(row.id);
        setLocalStartedAt(serverStartedAt);
        onSetStarted?.(row.id, serverStartedAt);
      } catch {
        setLocalStartedAt(row.started_at);
        onSetStarted?.(row.id, row.started_at);
      }
    });
  };

  const handleMarkDone = () => {
    setMarkDoneError(null);
    // Start rest immediately, synchronously — don't let anything below (a
    // slow flush, a failed completion write) hold up the rest timer.
    onDoneRest?.();

    // Mark done optimistically so Focus and List views agree on state right
    // away, instead of waiting for both server calls below to resolve.
    const optimisticTs = new Date().toISOString();
    setLocalCompletedAt(optimisticTs);
    onSetCompleted?.(row.id, optimisticTs);

    // A queued debounced field save could otherwise land after markSetDone
    // and, per updateWorkoutSet's "tracked field changed" logic, clear the
    // completed_at we're about to set.
    if (saveTimeoutRef.current != null) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    startMarkDone(async () => {
      try {
        // Flush the latest field values before validating/marking done — the
        // debounced autosave above may not have fired yet, so the server could
        // otherwise validate stale DB values.
        await updateWorkoutSet({
          id: row.id,
          reps: parseOptionalNumber(reps),
          weight: parseOptionalNumber(weight),
          rir: parseOptionalNumber(rir),
          duration_seconds: parseOptionalNumber(duration),
        });
        const result = await markSetDone(row.id);
        const ts = result?.completedAt ?? optimisticTs;
        setLocalCompletedAt(ts);
        onSetCompleted?.(row.id, ts);
      } catch (err) {
        // Roll back the optimistic completion so Focus/List/finish
        // validation don't think this set is done when it isn't.
        setLocalCompletedAt(null);
        onSetCompleted?.(row.id, null);
        setMarkDoneError(
          err instanceof Error ? err.message : "Could not mark set done",
        );
      }
    });
  };

  const handleClearDone = () => {
    setMarkDoneError(null);
    startClearDone(async () => {
      try {
        await clearSetDone(row.id);
        setLocalCompletedAt(null);
        onSetCompleted?.(row.id, null);
      } catch (err) {
        setMarkDoneError(
          err instanceof Error ? err.message : "Could not clear done state",
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

  const onTimerComplete = () => {
    setDuration(String(timerSecondsRef.current));
    setTimerEndAt(null);
  };

  const timerRemaining = useCountdownOnComplete(timerEndAt, onTimerComplete);

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
    hasStarted,
    startedAt,
    readyToComplete,
    markDonePending,
    clearDonePending,
    startPending,
    markDoneError,
    handleStartSet,
    handleMarkDone,
    handleClearDone,
    timerEndAt,
    setTimerEndAt,
    timerRemaining,
    startTimer,
  };
}
