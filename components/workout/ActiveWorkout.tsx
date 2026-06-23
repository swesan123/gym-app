"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addWorkoutSet,
  finishWorkout,
  removeWorkoutSet,
  updateWorkoutSet,
} from "@/app/actions/workouts";
import type { FlatSetRow } from "@/components/workout/groupSets";
import { groupFlatSets } from "@/components/workout/groupSets";
import { partitionGroupsByStretchKind } from "@/components/workout/partitionGroupsByStretchKind";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { SetType, TrackingType } from "@/lib/database.types";
import { parseOptionalNumber } from "@/lib/parse";
import { computeSetVolume } from "@/lib/volume";

function weightHeader(tt: TrackingType) {
  if (tt === "assisted") return "Assist";
  if (tt === "bodyweight") return "Extra wt";
  return "Wt";
}

function weightColumnTitle(tt: TrackingType): string | undefined {
  if (tt === "assisted") {
    return "Assistance / counterweight taken off your body, not effective load. Volume uses body weight from your profile.";
  }
  return undefined;
}

const REPS_PRESETS = Array.from({ length: 20 }, (_, i) => i + 1);
const RIR_PRESETS = [0, 1, 2, 3, 4];
const DURATION_PRESETS = [15, 20, 30, 45, 60, 90, 120];

function buildMachineWeightPresets({
  machineStartWeight,
  machineEndWeight,
  machineIncrement,
}: {
  machineStartWeight?: number | null;
  machineEndWeight?: number | null;
  machineIncrement?: number | null;
}): number[] {
  if (
    machineStartWeight == null ||
    machineEndWeight == null ||
    machineIncrement == null ||
    machineIncrement <= 0 ||
    machineEndWeight < machineStartWeight
  ) {
    return [];
  }

  const values: number[] = [];
  const maxSteps = 100;
  for (let i = 0; i < maxSteps; i += 1) {
    const value = machineStartWeight + i * machineIncrement;
    if (value > machineEndWeight + 1e-9) break;
    values.push(Number(value.toFixed(4)));
  }
  return values;
}

const NOTE_PREVIEW_MAX = 36;

function SetTableRow({
  row,
  weightPresets,
  showWeightCol,
  bodyWeight,
  readOnly,
  onRequestRemove,
  onOpenNote,
  onSetSaved,
  restSeconds,
  exerciseName,
  onSetTypeChange,
}: {
  row: FlatSetRow;
  weightPresets: number[];
  showWeightCol: boolean;
  bodyWeight: number | null;
  readOnly?: boolean;
  onRequestRemove: (setId: string) => void;
  onOpenNote: (setId: string, initial: string) => void;
  onSetSaved?: (restSeconds: number, exerciseName: string) => void;
  restSeconds?: number | null;
  exerciseName?: string;
  onSetTypeChange?: (setId: string, setType: SetType) => void;
}) {
  const [reps, setReps] = useState(() => row.reps?.toString() ?? "");
  const [weight, setWeight] = useState(() => row.weight?.toString() ?? "");
  const [rir, setRir] = useState(() => row.rir?.toString() ?? "");
  const [duration, setDuration] = useState(
    () => row.duration_seconds?.toString() ?? "",
  );

  const skipSave = useRef(true);

  const volumeLocal = computeSetVolume(row.tracking_type, {
    reps: parseOptionalNumber(reps),
    weight: parseOptionalNumber(weight),
    durationSeconds: parseOptionalNumber(duration),
    bodyWeight,
  });

  useEffect(() => {
    if (readOnly) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        try {
          await updateWorkoutSet({
            id: row.id,
            reps: parseOptionalNumber(reps),
            weight: parseOptionalNumber(weight),
            rir: parseOptionalNumber(rir),
            duration_seconds: parseOptionalNumber(duration),
          });
        } catch {
          // Error handling is done at the parent level
        }
      })();
    }, 500);
    return () => clearTimeout(t);
  }, [readOnly, row.id, reps, weight, rir, duration, onSetSaved, restSeconds, exerciseName]);

  const savedNote = row.note ?? "";
  const notePreview =
    savedNote.trim().length > 0
      ? savedNote.length > NOTE_PREVIEW_MAX
        ? `${savedNote.slice(0, NOTE_PREVIEW_MAX)}…`
        : savedNote
      : null;

  const tt = row.tracking_type;
  const repsOptions = [...new Set([...REPS_PRESETS, parseOptionalNumber(reps) ?? NaN])]
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const weightOptions = [
    ...new Set([...weightPresets, parseOptionalNumber(weight) ?? NaN]),
  ]
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const rirOptions = [...new Set([...RIR_PRESETS, parseOptionalNumber(rir) ?? NaN])]
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const durationOptions = [
    ...new Set([...DURATION_PRESETS, parseOptionalNumber(duration) ?? NaN]),
  ]
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  const cellInput =
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-[var(--gray-300)] bg-[var(--chalk-white)] px-1.5 text-sm dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]";
  const readOnlyCellInput =
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-[var(--gray-300)] bg-[var(--gray-50)] px-1.5 text-sm text-right tabular-nums text-[var(--steel-gray)] cursor-default dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--gray-300)]";

  return (
    <tr className="border-b border-[var(--gray-100)] dark:border-[var(--gray-100)]">
      <td className="sticky left-0 z-10 bg-[var(--chalk-white)] py-1 pr-1 text-center text-xs font-semibold tabular-nums dark:bg-[var(--gray-50)]">
        {row.set_number}
      </td>
      {tt === "timed" ? (
        <td className="py-1 pr-1">
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
      <td className="min-w-[4.75rem] py-1 pl-2 pr-1">
        <input
          value={volumeLocal == null ? "—" : Math.round(volumeLocal).toLocaleString()}
          readOnly
          tabIndex={-1}
          aria-label="Set volume"
          className={readOnlyCellInput}
        />
      </td>
      <td className="max-w-[7rem] min-w-0 py-1 pl-2 pr-1 sm:max-w-[10rem]">
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
        <>
          <td className="py-1 text-center">
            <button
              type="button"
              onClick={() => {
                onSetTypeChange?.(row.id, row.set_type === "warmup" ? "working" : "warmup");
              }}
              className={`text-xs font-semibold rounded px-2 py-1 transition ${
                row.set_type === "warmup"
                  ? "bg-[var(--gray-200)] text-[var(--gray-600)] dark:bg-[var(--gray-200)] dark:text-[var(--gray-300)]"
                  : "text-[var(--gray-500)] hover:bg-[var(--gray-100)] dark:text-[var(--gray-400)] dark:hover:bg-[var(--gray-100)]"
              }`}
              aria-label={`Toggle set type: ${row.set_type}`}
              title={row.set_type === "warmup" ? "Warmup set - excluded from volume" : "Working set"}
            >
              {row.set_type === "warmup" ? "W" : "○"}
            </button>
          </td>
          <td className="py-1 text-center">
            <button
              type="button"
              onClick={() => onRequestRemove(row.id)}
              className="rounded px-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              ×
            </button>
          </td>
        </>
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
  sets,
  rows,
  weightPresets,
  bodyWeight,
  readOnly,
  pending,
  restSeconds,
  onScheduleRest,
  onAddSet,
  onRequestRemove,
}: {
  exerciseName: string;
  exerciseNotes?: string | null;
  trackingType: TrackingType;
  sets: { id: string; set_number: number }[];
  rows: FlatSetRow[];
  weightPresets: number[];
  bodyWeight: number | null;
  readOnly?: boolean;
  pending: boolean;
  restSeconds: number | null;
  onScheduleRest: (seconds: number, label: string) => void;
  onAddSet: () => void;
  onRequestRemove: (setId: string) => void;
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
    void (async () => {
      try {
        await updateWorkoutSet({ id: t.setId, note });
        setNoteTarget(null);
        router.refresh();
      } catch {
        setNoteTarget(null);
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
              <th className="min-w-[4.5rem] py-2 pr-1">RIR</th>
              <th className="min-w-[4.75rem] py-2 pl-2 pr-1 text-right">Vol</th>
              <th className="min-w-[7.5rem] py-2 pl-2 pr-1">Note</th>
              {!readOnly ? (
                <>
                  <th className="w-8 py-2 text-center" title="Warmup/Working">
                    Type
                  </th>
                  <th className="w-8 py-2 text-center" />
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => {
              const flat = rows.find((r) => r.id === s.id);
              if (!flat) return null;
              return (
                <SetTableRow
                  key={`${s.id}-${flat.reps ?? ""}-${flat.weight ?? ""}-${flat.rir ?? ""}-${flat.duration_seconds ?? ""}-${flat.note ?? ""}`}
                  row={flat}
                  weightPresets={weightPresets}
                  showWeightCol={showWeightCol}
                  bodyWeight={bodyWeight}
                  readOnly={readOnly}
                  onRequestRemove={onRequestRemove}
                  onOpenNote={(setId, initial) =>
                    setNoteTarget({ setId, draft: initial })
                  }
                  onSetSaved={onScheduleRest}
                  restSeconds={restSeconds}
                  exerciseName={exerciseName}
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
          {restSeconds != null && restSeconds > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-10 w-full shrink-0 border border-[var(--gray-300)] py-2 text-sm dark:border-[var(--gray-200)] sm:w-auto sm:min-w-[8rem]"
              disabled={pending}
              onClick={() => onScheduleRest(restSeconds, exerciseName)}
            >
              Start rest
            </Button>
          ) : null}
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
  const [rest, setRest] = useState<{ seconds: number; label: string } | null>(
    null,
  );

  const groups = useMemo(() => groupFlatSets(rows), [rows]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  /** Play audio/haptic feedback for rest timer */
  const playRestAlert = useCallback((event: "start" | "end") => {
    // Web Audio API beep for rest end
    if (event === "end") {
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

      // Haptic feedback for Android PWA
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      // Native notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Rest complete", {
          body: rest?.label || "Time to lift",
          tag: "rest-timer",
        });
      }
    }
  }, [rest]);

  const scheduleRest = useCallback((seconds: number, label: string) => {
    if (status === "completed" || seconds <= 0) return;
    setRest({ seconds, label });
    playRestAlert("start");
  }, [status, playRestAlert]);

  useEffect(() => {
    if (rest == null || rest.seconds <= 0) return;
    const id = window.setInterval(() => {
      setRest((r) => {
        if (r == null || r.seconds <= 1) {
          playRestAlert("end");
          return null;
        }
        return { ...r, seconds: r.seconds - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [rest, playRestAlert]);

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
    startTransition(async () => {
      try {
        await removeWorkoutSet(id, workoutId);
        setRemoveTarget(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove set");
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

  const readOnly = status === "completed";

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
        <div className="px-0 pt-1">
          <p className="text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">{split}</p>
          <h1 className="text-lg font-bold leading-snug text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            {readOnly ? "Workout (completed)" : "Active workout"}
          </h1>
        </div>
        {!readOnly && rest != null && rest.seconds > 0 ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/50">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Rest {rest.seconds}s · {rest.label}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 shrink-0 text-sm"
              onClick={() => setRest(null)}
            >
              Skip
            </Button>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="px-3 pt-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {readOnly ? (
        <WorkoutSummary groups={groups} />
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
                          rows.find((r) => r.exercise_id === g.exercise_id)
                            ?.exercise_notes
                        }
                        trackingType={g.tracking_type}
                        sets={g.sets}
                        rows={rows}
                        weightPresets={
                          exerciseWeightPresets.get(g.exercise_id) ??
                          weightPresets
                        }
                        bodyWeight={bodyWeight}
                        readOnly={readOnly}
                        pending={pending}
                        restSeconds={g.rest_seconds}
                        onScheduleRest={scheduleRest}
                        onAddSet={() => handleAddSet(g.exercise_id)}
                        onRequestRemove={requestRemoveSet}
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
    </>
  );
}
