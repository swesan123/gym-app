"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addWorkoutSet,
  finishWorkout,
  removeWorkoutSet,
  updateWorkoutSet,
} from "@/app/actions/workouts";
import { FocusSetCard } from "@/components/workout/FocusSetCard";
import { buildFocusSteps } from "@/components/workout/focusSteps";
import type { FlatSetRow } from "@/components/workout/groupSets";
import { groupFlatSets } from "@/components/workout/groupSets";
import { partitionGroupsByStretchKind } from "@/components/workout/partitionGroupsByStretchKind";
import {
  DURATION_PRESETS,
  REPS_PRESETS,
  RIR_PRESETS,
  buildMachineWeightPresets,
  mergeNumberOptions,
  weightColumnTitle,
  weightHeader,
} from "@/components/workout/setFieldPresets";
import { useSetEditor } from "@/components/workout/useSetEditor";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { SetType, StretchKind, TrackingType } from "@/lib/database.types";
import { useCountdown } from "@/lib/useCountdown";

const NOTE_PREVIEW_MAX = 36;

const REST_STORAGE_PREFIX = "gym-app:rest:";
const VIEW_MODE_STORAGE_PREFIX = "gym-app:viewMode:";

type ViewMode = "list" | "focus";

function SetTableRow({
  row,
  weightPresets,
  showWeightCol,
  bodyWeight,
  readOnly,
  onRequestRemove,
  onOpenNote,
  onSetTypeChange,
  onDoneRest,
  onSetCompleted,
}: {
  row: FlatSetRow;
  weightPresets: number[];
  showWeightCol: boolean;
  bodyWeight: number | null;
  readOnly?: boolean;
  onRequestRemove: (setId: string) => void;
  onOpenNote: (setId: string, initial: string) => void;
  onSetTypeChange?: (setId: string, setType: SetType) => void;
  onDoneRest?: () => void;
  onSetCompleted?: (setId: string, completedAt: string | null) => void;
}) {
  const {
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
    clearDonePending,
    markDoneError,
    handleMarkDone,
    handleClearDone,
    timerEndAt,
    timerRemaining,
    startTimer,
  } = useSetEditor({ row, bodyWeight, readOnly, onDoneRest, onSetCompleted });

  const savedNote = row.note ?? "";
  const notePreview =
    savedNote.trim().length > 0
      ? savedNote.length > NOTE_PREVIEW_MAX
        ? `${savedNote.slice(0, NOTE_PREVIEW_MAX)}…`
        : savedNote
      : null;

  const tt = row.tracking_type;
  const repsOptions = mergeNumberOptions(REPS_PRESETS, reps);
  const weightOptions = mergeNumberOptions(weightPresets, weight);
  const rirOptions = mergeNumberOptions(RIR_PRESETS, rir);
  const durationOptions = mergeNumberOptions(DURATION_PRESETS, duration);

  const cellInput =
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-[var(--gray-300)] bg-[var(--chalk-white)] px-1.5 text-sm dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]";
  const readOnlyCellInput =
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-[var(--gray-300)] bg-[var(--gray-50)] px-1.5 text-sm text-right tabular-nums text-[var(--steel-gray)] cursor-default dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--gray-300)]";

  const rowBg = isDone
    ? "bg-emerald-50/70 dark:bg-emerald-900/20"
    : "";

  return (
    <tr className={`border-b border-[var(--gray-100)] transition-colors dark:border-[var(--gray-100)] ${rowBg}`}>
      <td className={`sticky left-0 z-10 py-1 pr-1 text-center text-xs font-semibold tabular-nums ${isDone ? "bg-emerald-50/70 dark:bg-emerald-900/20" : "bg-[var(--chalk-white)] dark:bg-[var(--gray-50)]"}`}>
        {row.set_number}
      </td>
      {tt === "timed" ? (
        <td className="py-1 pr-1">
          <div className="flex items-center gap-1">
            <select
              disabled={readOnly}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={cellInput}
              aria-label="Seconds"
            >
              <option value="">—</option>
              {durationOptions.map((v) => (
                <option key={`duration-${row.id}-${v}`} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {!readOnly ? (
              timerEndAt != null ? (
                <span className="font-data w-10 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--gym-amber)]">
                  {timerRemaining}s
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!duration}
                  onClick={() => startTimer(Number(duration))}
                  className="shrink-0 rounded px-1.5 py-1 text-xs font-semibold text-[var(--gym-amber)] hover:bg-[var(--gray-100)] disabled:opacity-40 dark:hover:bg-[var(--gray-100)]"
                  aria-label="Start countdown"
                >
                  ▶
                </button>
              )
            ) : null}
          </div>
        </td>
      ) : (
        <td className="py-1 pr-1">
          <select
            disabled={readOnly}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={cellInput}
            aria-label="Reps"
          >
            <option value="">—</option>
            {repsOptions.map((v) => (
              <option key={`reps-${row.id}-${v}`} value={v}>
                {v}
              </option>
            ))}
          </select>
        </td>
      )}
      {showWeightCol && (
        <td className="py-1 pr-1">
          <select
            disabled={readOnly}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={cellInput}
            aria-label={weightHeader(tt)}
          >
            <option value="">—</option>
            {weightOptions.map((v) => (
              <option key={`weight-${row.id}-${v}`} value={v}>
                {v}
              </option>
            ))}
          </select>
        </td>
      )}
      {row.stretch_kind === "none" && (
        <td className="py-1 pr-1">
          <select
            disabled={readOnly}
            value={rir}
            onChange={(e) => setRir(e.target.value)}
            className={cellInput}
            aria-label="RIR"
          >
            <option value="">—</option>
            {rirOptions.map((v) => (
              <option key={`rir-${row.id}-${v}`} value={v}>
                {v}
              </option>
            ))}
          </select>
        </td>
      )}
      {readOnly && (
        <td className="min-w-[4.75rem] py-1 pl-2 pr-1">
          <input
            value={volumeLocal == null ? "—" : Math.round(volumeLocal).toLocaleString()}
            readOnly
            tabIndex={-1}
            aria-label="Set volume"
            className={readOnlyCellInput}
          />
        </td>
      )}
      <td className="min-w-0 max-w-[5rem] py-1 pl-2 pr-1 sm:max-w-[8rem]">
        {readOnly ? (
          <span className="block max-h-10 overflow-hidden break-words px-1.5 text-left text-sm leading-snug text-[var(--gray-600)] line-clamp-2 dark:text-[var(--gray-400)]">
            {notePreview ?? "—"}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onOpenNote(row.id, row.note ?? "")}
            className={`${cellInput} max-h-10 min-h-0 min-w-0 touch-manipulation overflow-hidden text-left leading-snug line-clamp-2`}
            aria-label="Edit note"
          >
            {notePreview ? (
              <span className="block min-w-0 break-words">{notePreview}</span>
            ) : (
              <span className="text-[var(--gray-400)]">Add note…</span>
            )}
          </button>
        )}
      </td>
      {!readOnly ? (
        <td className="py-1 pl-1 pr-1">
          <div className="flex items-center justify-end gap-1">
            {markDoneError ? (
              <span
                className="max-w-[5rem] truncate text-[10px] leading-tight text-red-600"
                title={markDoneError}
              >
                !
              </span>
            ) : null}
            {/* Only show warmup badge when set is actually warmup — working sets get no badge */}
            {row.set_type === "warmup" ? (
              <button
                type="button"
                onClick={() => onSetTypeChange?.(row.id, "working")}
                className="shrink-0 rounded bg-[var(--gray-200)] px-1.5 py-1 text-xs font-semibold text-[var(--gray-600)] transition hover:bg-[var(--gray-300)] dark:bg-[var(--gray-200)] dark:text-[var(--gray-300)]"
                aria-label="Warmup set — tap to make working"
                title="Warmup set – excluded from volume. Tap to make working."
              >
                W
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSetTypeChange?.(row.id, "warmup")}
                className="shrink-0 rounded px-1.5 py-1 text-[10px] font-semibold text-[var(--gray-400)] transition hover:bg-[var(--gray-100)] hover:text-[var(--gray-600)] dark:text-[var(--gray-500)] dark:hover:bg-[var(--gray-100)]"
                aria-label="Working set — tap to make warmup"
                title="Working set. Tap to mark as warmup."
              >
                W?
              </button>
            )}
            {isDone ? (
              <button
                type="button"
                disabled={clearDonePending}
                onClick={handleClearDone}
                className="shrink-0 rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                aria-label={`Edit set ${row.set_number}`}
                title="Tap to edit this set"
              >
                {clearDonePending ? "…" : "Edit"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!readyToComplete || markDonePending}
                onClick={handleMarkDone}
                className="shrink-0 rounded bg-[var(--gym-amber)] px-2 py-1 text-xs font-semibold text-[var(--chalk-white)] transition hover:bg-orange-600 disabled:opacity-40"
                aria-label={`Mark set ${row.set_number} done`}
              >
                {markDonePending ? "…" : "Done"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRequestRemove(row.id)}
              className="shrink-0 rounded px-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              aria-label={`Remove set ${row.set_number}`}
            >
              ×
            </button>
          </div>
        </td>
      ) : (
        <td className="py-1" />
      )}
    </tr>
  );
}

function ExerciseSetTable({
  exerciseName,
  exerciseNotes,
  trackingType,
  stretchKind,
  sets,
  rows,
  weightPresets,
  bodyWeight,
  readOnly,
  pending,
  restSeconds,
  onAddSet,
  onRequestRemove,
  onUpdateNote,
  onError,
  onDoneRest,
  onSetCompleted,
}: {
  exerciseName: string;
  exerciseNotes?: string | null;
  trackingType: TrackingType;
  stretchKind: StretchKind;
  sets: { id: string; set_number: number }[];
  rows: FlatSetRow[];
  weightPresets: number[];
  bodyWeight: number | null;
  readOnly?: boolean;
  pending: boolean;
  restSeconds: number | null;
  onAddSet: () => void;
  onRequestRemove: (setId: string) => void;
  onUpdateNote: (setId: string, note: string | null) => void;
  onError: (message: string) => void;
  onDoneRest: (restSeconds: number | null, exerciseName: string, isLastSetOfExercise: boolean) => void;
  onSetCompleted: (setId: string, completedAt: string | null) => void;
}) {
  const router = useRouter();
  const tt = trackingType;
  const showWeightCol =
    tt === "weighted" || tt === "assisted" || tt === "bodyweight";

  const [noteTarget, setNoteTarget] = useState<{
    setId: string;
    draft: string;
  } | null>(null);

  const onNoteConfirm = () => {
    if (!noteTarget) return;
    const t = noteTarget;
    const note = t.draft.trim() ? t.draft.trim() : null;

    onUpdateNote(t.setId, note);
    setNoteTarget(null);

    void (async () => {
      try {
        await updateWorkoutSet({ id: t.setId, note });
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to save note");
      }
    })();
  };

  const onNoteCancel = () => setNoteTarget(null);

  return (
    <>
    <section className="rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] dark:border-[var(--gray-100)] dark:bg-[var(--gray-50)]">
      <div className="border-b border-[var(--gray-100)] px-2 py-2 dark:border-[var(--gray-100)]">
        <h2 className="text-base font-bold leading-tight text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
          {exerciseName}
        </h2>
        {exerciseNotes ? (
          <p className="mt-1 text-xs text-[var(--gray-600)] dark:text-[var(--gray-400)]">
            {exerciseNotes}
          </p>
        ) : null}
      </div>
      <div className="w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-0 table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)] text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:border-[var(--gray-100)] dark:bg-[var(--gray-100)]/50 dark:text-[var(--gray-400)]">
              <th className="sticky left-0 z-10 w-8 bg-[var(--gray-50)] py-2 pl-1 pr-1 text-center dark:bg-[var(--gray-100)]/50">
                #
              </th>
              <th className="min-w-[3rem] py-2 pr-1">
                {tt === "timed" ? "Sec" : "Reps"}
              </th>
              {showWeightCol ? (
                <th
                  className="min-w-[3.5rem] py-2 pr-1"
                  title={weightColumnTitle(tt)}
                >
                  {weightHeader(tt)}
                </th>
              ) : null}
              {stretchKind === "none" && (
                <th className="min-w-[4.5rem] py-2 pr-1">RIR</th>
              )}
              {readOnly && (
                <th className="min-w-[4.75rem] py-2 pl-2 pr-1 text-right">Vol</th>
              )}
              <th className="min-w-[5rem] py-2 pl-2 pr-1">Note</th>
              {!readOnly ? <th className="w-[5.5rem] py-2 pr-1" /> : null}
            </tr>
          </thead>
          <tbody>
            {sets.map((s, idx) => {
              const flat = rows.find((r) => r.id === s.id);
              if (!flat) return null;
              const isLastSetOfExercise = idx === sets.length - 1;
              return (
                <SetTableRow
                  key={s.id}
                  row={flat}
                  weightPresets={weightPresets}
                  showWeightCol={showWeightCol}
                  bodyWeight={bodyWeight}
                  readOnly={readOnly}
                  onRequestRemove={onRequestRemove}
                  onOpenNote={(setId, initial) =>
                    setNoteTarget({ setId, draft: initial })
                  }
                  onDoneRest={() =>
                    onDoneRest(restSeconds, exerciseName, isLastSetOfExercise)
                  }
                  onSetCompleted={onSetCompleted}
                  onSetTypeChange={(setId, setType) => {
                    void (async () => {
                      try {
                        await updateWorkoutSet({ id: setId, set_type: setType });
                        router.refresh();
                      } catch {
                        // Error handling done at parent level
                      }
                    })();
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly ? (
        <div className="flex flex-col gap-2 border-t border-[var(--gray-100)] px-2 py-2 dark:border-[var(--gray-100)] sm:flex-row">
          <Button
            variant="secondary"
            type="button"
            className="min-h-10 w-full flex-1 py-2 text-sm"
            disabled={pending}
            onClick={onAddSet}
          >
            + Set
          </Button>
        </div>
      ) : null}
    </section>

    {!readOnly ? (
      <Modal
        open={!!noteTarget}
        title="Set note"
        description="Edit your note here. Use Done or Cancel to close."
        confirmLabel="Done"
        cancelLabel="Cancel"
        closeOnBackdrop={false}
        closeOnEscape={false}
        onCancel={onNoteCancel}
        onConfirm={onNoteConfirm}
      >
        <textarea
          value={noteTarget?.draft ?? ""}
          onChange={(e) =>
            setNoteTarget((n) =>
              n ? { ...n, draft: e.target.value } : n,
            )
          }
          rows={6}
          autoFocus
          autoComplete="off"
          className="min-h-[8rem] w-full resize-y rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] p-3 text-base dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]"
          aria-label="Note text"
        />
      </Modal>
    ) : null}
    </>
  );
}

export function ActiveWorkout({
  workoutId,
  split,
  status,
  rows,
  weightPresets,
  exercisePresetMap,
  bodyWeight,
}: {
  workoutId: string;
  split: string;
  status: "draft" | "completed";
  rows: FlatSetRow[];
  weightPresets: number[];
  exercisePresetMap: Record<string, number[]>;
  bodyWeight: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  const readOnly = status === "completed";
  const restStorageKey = `${REST_STORAGE_PREFIX}${workoutId}`;
  const viewModeStorageKey = `${VIEW_MODE_STORAGE_PREFIX}${workoutId}`;

  // Rest timer persisted as an absolute epoch so it survives tab
  // backgrounding, throttling, and page refresh (#67).
  const [restEndAt, setRestEndAt] = useState<number | null>(() => {
    if (typeof window === "undefined" || readOnly) return null;
    const raw = window.sessionStorage.getItem(restStorageKey);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > Date.now() ? parsed : null;
  });
  const [restLabel, setRestLabel] = useState<string>("");
  const restLabelRef = useRef<string>("");
  const restRemaining = useCountdown(restEndAt);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const raw = window.sessionStorage.getItem(viewModeStorageKey);
    return raw === "focus" ? "focus" : "list";
  });
  const [focusIndex, setFocusIndex] = useState(0);
  const [focusNoteTarget, setFocusNoteTarget] = useState<{
    setId: string;
    draft: string;
  } | null>(null);

  const [localRows, setLocalRows] = useState(() => rows);

  const updateRowNote = useCallback((setId: string, note: string | null) => {
    setLocalRows(prev => prev.map(row =>
      row.id === setId ? { ...row, note } : row
    ));
  }, []);

  const updateRowCompletion = useCallback((setId: string, completedAt: string | null) => {
    setLocalRows(prev => prev.map(row =>
      row.id === setId ? { ...row, completed_at: completedAt } : row
    ));
  }, []);

  const removeRow = useCallback((setId: string) => {
    setLocalRows(prev => prev.filter(r => r.id !== setId));
  }, []);

  const restoreRow = useCallback((row: FlatSetRow) => {
    setLocalRows(prev => [...prev, row]);
  }, []);

  const groups = useMemo(() => groupFlatSets(localRows), [localRows]);
  const focusSteps = useMemo(() => buildFocusSteps(groups), [groups]);

  const setViewModePersisted = (mode: ViewMode) => {
    setViewMode(mode);
    window.sessionStorage.setItem(viewModeStorageKey, mode);
  };

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  /** Play audio/haptic feedback for rest completion. */
  const playRestAlert = useCallback(() => {
    try {
      const AudioContextConstructor = window.AudioContext || ((window as unknown as Record<string, unknown>).webkitAudioContext as typeof window.AudioContext);
      const audioContext = new AudioContextConstructor();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio context not available
    }

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Rest complete", {
        body: restLabelRef.current || "Time to lift",
        tag: "rest-timer",
      });
    }
  }, []);

  const stopRestTimer = useCallback(() => {
    setRestEndAt(null);
    window.sessionStorage.removeItem(restStorageKey);
  }, [restStorageKey]);

  const startRestTimer = useCallback((seconds: number, label: string) => {
    if (readOnly || seconds <= 0) return;
    const endAt = Date.now() + seconds * 1000;
    restLabelRef.current = label;
    setRestLabel(label);
    setRestEndAt(endAt);
    window.sessionStorage.setItem(restStorageKey, String(endAt));
  }, [readOnly, restStorageKey]);

  // Fire the alert and clear storage once the countdown naturally reaches zero.
  useEffect(() => {
    if (restEndAt == null) return;
    if (restRemaining > 0) return;
    playRestAlert();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestEndAt(null);
    window.sessionStorage.removeItem(restStorageKey);
  }, [restRemaining, restEndAt, playRestAlert, restStorageKey]);

  const exerciseWeightPresets = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const row of rows) {
      if (map.has(row.exercise_id)) continue;
      const exercisePins = exercisePresetMap[row.exercise_id] ?? [];
      const machinePresets = buildMachineWeightPresets({
        machineStartWeight: row.machine_start_weight,
        machineEndWeight: row.machine_end_weight,
        machineIncrement: row.machine_increment,
      });
      let merged: number[];
      if (exercisePins.length > 0) {
        merged = [...new Set([...exercisePins, ...machinePresets])].sort(
          (a, b) => a - b,
        );
      } else if (machinePresets.length > 0) {
        merged = [...new Set(machinePresets)].sort((a, b) => a - b);
      } else {
        merged = [...new Set(weightPresets)].sort((a, b) => a - b);
      }
      map.set(row.exercise_id, merged);
    }
    return map;
  }, [rows, weightPresets, exercisePresetMap]);

  const onConfirmRemove = () => {
    if (!removeTarget) return;
    const id = removeTarget;
    const removedRow = localRows.find(r => r.id === id);

    removeRow(id);
    setRemoveTarget(null);

    startTransition(async () => {
      try {
        await removeWorkoutSet(id, workoutId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove set");
        if (removedRow) {
          restoreRow(removedRow);
        }
      }
    });
  };

  /** Defer opening the confirm modal so the same pointer gesture cannot "land" on the backdrop and dismiss it (mobile / touch). */
  const requestRemoveSet = (setId: string) => {
    window.setTimeout(() => setRemoveTarget(setId), 0);
  };

  const onFinish = () => {
    startTransition(async () => {
      try {
        await finishWorkout(workoutId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not finish workout");
      }
    });
  };

  const handleAddSet = (exerciseId: string) => {
    startTransition(async () => {
      try {
        await addWorkoutSet(workoutId, exerciseId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add set");
      }
    });
  };

  /** Start rest after Done is tapped — skips automatically on the last set of the exercise (#66, #67). */
  const handleDoneRest = (restSeconds: number | null, exerciseName: string, isLastSetOfExercise: boolean) => {
    if (isLastSetOfExercise || restSeconds == null || restSeconds <= 0) return;
    startRestTimer(restSeconds, exerciseName);
  };

  const clampedFocusIndex =
    focusSteps.length > 0 ? Math.min(focusIndex, focusSteps.length - 1) : 0;
  const focusStep = focusSteps[clampedFocusIndex] ?? null;
  const focusRow = focusStep
    ? localRows.find((r) => r.id === focusStep.setId) ?? null
    : null;
  const focusGroup = focusStep
    ? groups.find((g) => g.exercise_id === focusStep.exerciseId) ?? null
    : null;

  const focusOnDoneRest = () => {
    if (!focusStep || !focusGroup) return;
    handleDoneRest(focusGroup.rest_seconds, focusGroup.exercise_name, focusStep.isLastSetOfExercise);
    if (focusStep.isLastStepOfWorkout) {
      setFinishOpen(true);
    } else {
      setFocusIndex((i) => Math.min(i + 1, focusSteps.length - 1));
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--gray-200)] bg-[var(--chalk-white)]/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur dark:border-[var(--gray-100)] dark:bg-[var(--gray-50)]/95">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            type="button"
            className="min-h-10 px-2 text-sm"
            onClick={() => router.push("/")}
          >
            ← Home
          </Button>
          {!readOnly ? (
            <Button
              type="button"
              disabled={pending}
              className="min-h-10"
              onClick={() => setFinishOpen(true)}
            >
              Finish
            </Button>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2 px-0 pt-1">
          <div>
            <p className="text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">{split}</p>
            <h1 className="text-lg font-bold leading-snug text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              {readOnly ? "Workout (completed)" : "Active workout"}
            </h1>
          </div>
          {!readOnly ? (
            <div className="flex shrink-0 rounded-lg border border-[var(--gray-300)] p-0.5 dark:border-[var(--gray-200)]">
              <button
                type="button"
                onClick={() => setViewModePersisted("list")}
                className={`min-h-8 rounded px-3 text-xs font-semibold transition ${
                  viewMode === "list"
                    ? "bg-[var(--gym-amber)] text-[var(--chalk-white)]"
                    : "text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewModePersisted("focus")}
                className={`min-h-8 rounded px-3 text-xs font-semibold transition ${
                  viewMode === "focus"
                    ? "bg-[var(--gym-amber)] text-[var(--chalk-white)]"
                    : "text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                }`}
              >
                Focus
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="px-3 pt-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {readOnly ? (
        <WorkoutSummary groups={groups} />
      ) : viewMode === "focus" ? (
        focusStep && focusRow && focusGroup ? (
          <FocusSetCard
            key={focusStep.setId}
            row={focusRow}
            exerciseName={focusStep.exerciseName}
            weightPresets={
              exerciseWeightPresets.get(focusStep.exerciseId) ?? weightPresets
            }
            showWeightCol={
              focusGroup.tracking_type === "weighted" ||
              focusGroup.tracking_type === "assisted" ||
              focusGroup.tracking_type === "bodyweight"
            }
            showRirCol={focusGroup.stretch_kind === "none"}
            bodyWeight={bodyWeight}
            totalSetsForExercise={focusGroup.sets.length}
            setPositionInExercise={focusStep.setIndexInExercise}
            stepIndex={clampedFocusIndex}
            totalSteps={focusSteps.length}
            onBack={() => setFocusIndex((i) => Math.max(0, i - 1))}
            onNext={() => setFocusIndex((i) => Math.min(i + 1, focusSteps.length - 1))}
            onDoneRest={focusOnDoneRest}
            onOpenNote={() =>
              setFocusNoteTarget({ setId: focusRow.id, draft: focusRow.note ?? "" })
            }
            onSetCompleted={updateRowCompletion}
          />
        ) : (
          <p className="px-4 py-8 text-center text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
            No sets to focus on yet.
          </p>
        )
      ) : (
        <div className="flex touch-manipulation flex-col gap-6 px-2 pb-28 pt-2 sm:px-3">
          {partitionGroupsByStretchKind(groups).map(
            (sec) =>
              sec.groups.length > 0 && (
                <section
                  key={sec.key}
                  className="rounded-lg border border-[var(--gray-300)]/80 bg-[var(--gray-50)]/80 p-3 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]/50 sm:p-4"
                >
                  <h2 className="text-base font-bold uppercase tracking-wide text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                    {sec.title}
                  </h2>
                  <div className="mt-3 flex flex-col gap-3">
                    {sec.groups.map((g) => (
                      <ExerciseSetTable
                        key={g.exercise_id}
                        exerciseName={g.exercise_name}
                        exerciseNotes={
                          localRows.find((r) => r.exercise_id === g.exercise_id)
                            ?.exercise_notes
                        }
                        trackingType={g.tracking_type}
                        stretchKind={g.stretch_kind}
                        sets={g.sets}
                        rows={localRows}
                        weightPresets={
                          exerciseWeightPresets.get(g.exercise_id) ??
                          weightPresets
                        }
                        bodyWeight={bodyWeight}
                        readOnly={readOnly}
                        pending={pending}
                        restSeconds={g.rest_seconds}
                        onAddSet={() => handleAddSet(g.exercise_id)}
                        onRequestRemove={requestRemoveSet}
                        onUpdateNote={updateRowNote}
                        onError={setError}
                        onDoneRest={handleDoneRest}
                        onSetCompleted={updateRowCompletion}
                      />
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
      )}

      <Modal
        open={!!removeTarget}
        title="Remove this set?"
        description="This deletes the set row for this workout."
        variant="danger"
        confirmLabel="Remove set"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={onConfirmRemove}
      />

      <Modal
        open={finishOpen}
        title="Finish workout?"
        description="Marks this session complete and returns home. You can review it in History."
        confirmLabel="Finish workout"
        onCancel={() => setFinishOpen(false)}
        onConfirm={() => {
          setFinishOpen(false);
          onFinish();
        }}
      />

      {!readOnly && viewMode === "focus" ? (
        <Modal
          open={!!focusNoteTarget}
          title="Set note"
          description="Edit your note here. Use Done or Cancel to close."
          confirmLabel="Done"
          cancelLabel="Cancel"
          closeOnBackdrop={false}
          closeOnEscape={false}
          onCancel={() => setFocusNoteTarget(null)}
          onConfirm={() => {
            if (!focusNoteTarget) return;
            const t = focusNoteTarget;
            const note = t.draft.trim() ? t.draft.trim() : null;
            updateRowNote(t.setId, note);
            setFocusNoteTarget(null);
            void updateWorkoutSet({ id: t.setId, note }).catch((err) => {
              setError(err instanceof Error ? err.message : "Failed to save note");
            });
          }}
        >
          <textarea
            value={focusNoteTarget?.draft ?? ""}
            onChange={(e) =>
              setFocusNoteTarget((n) => (n ? { ...n, draft: e.target.value } : n))
            }
            rows={6}
            autoFocus
            autoComplete="off"
            className="min-h-[8rem] w-full resize-y rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] p-3 text-base dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]"
            aria-label="Note text"
          />
        </Modal>
      ) : null}

      {!readOnly && restEndAt != null && restRemaining > 0 ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Rest timer
          </p>
          <p className="mt-2 font-data text-[5rem] font-bold leading-none tabular-nums text-white">
            {restRemaining}s
          </p>
          <p className="mt-3 text-base text-white/60">{restLabel}</p>
          <Button
            type="button"
            variant="ghost"
            className="mt-10 min-h-12 rounded-2xl border border-white/25 px-10 text-base text-white hover:bg-white/10"
            onClick={stopRestTimer}
          >
            Skip rest
          </Button>
        </div>
      ) : null}
    </>
  );
}
