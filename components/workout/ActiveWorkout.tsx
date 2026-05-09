"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addWorkoutSet,
  finishWorkout,
  removeWorkoutSet,
  updateWorkoutSet,
} from "@/app/actions/workouts";
import type { FlatSetRow } from "@/components/workout/groupSets";
import { groupFlatSets } from "@/components/workout/groupSets";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { TrackingType } from "@/lib/database.types";
import { parseOptionalNumber } from "@/lib/parse";
import { computeSetVolume } from "@/lib/volume";

function weightHeader(tt: TrackingType) {
  if (tt === "assisted") return "Weight";
  if (tt === "bodyweight") return "Extra wt";
  return "Wt";
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

function SetTableRow({
  row,
  weightPresets,
  showWeightCol,
  bodyWeight,
  readOnly,
  onRequestRemove,
}: {
  row: FlatSetRow;
  weightPresets: number[];
  showWeightCol: boolean;
  bodyWeight: number | null;
  readOnly?: boolean;
  onRequestRemove: (setId: string) => void;
}) {
  const [reps, setReps] = useState(() => row.reps?.toString() ?? "");
  const [weight, setWeight] = useState(() => row.weight?.toString() ?? "");
  const [rir, setRir] = useState(() => row.rir?.toString() ?? "");
  const [duration, setDuration] = useState(
    () => row.duration_seconds?.toString() ?? "",
  );
  const [note, setNote] = useState(() => row.note ?? "");

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
      void updateWorkoutSet({
        id: row.id,
        reps: parseOptionalNumber(reps),
        weight: parseOptionalNumber(weight),
        rir: parseOptionalNumber(rir),
        duration_seconds: parseOptionalNumber(duration),
        note: note.trim() ? note.trim() : null,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [readOnly, row.id, reps, weight, rir, duration, note]);

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
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-zinc-300 bg-white px-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950";
  const readOnlyCellInput =
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-zinc-300 bg-zinc-50 px-1.5 text-sm text-right tabular-nums text-zinc-700 cursor-default dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300";

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="sticky left-0 z-10 bg-white py-1 pr-1 text-center text-xs font-semibold tabular-nums dark:bg-zinc-900">
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
      <td className="max-w-[7rem] py-1 pl-2 pr-1 sm:max-w-[10rem]">
        <input
          type="text"
          enterKeyHint="done"
          disabled={readOnly}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${cellInput} touch-manipulation`}
          aria-label="Note"
          autoComplete="off"
          autoCorrect="off"
        />
      </td>
      {!readOnly ? (
        <td className="py-1 text-center">
          <button
            type="button"
            onClick={() => onRequestRemove(row.id)}
            className="rounded px-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            ×
          </button>
        </td>
      ) : (
        <td className="py-1" />
      )}
    </tr>
  );
}

function ExerciseSetTable({
  exerciseName,
  exerciseId,
  exerciseNotes,
  trackingType,
  sets,
  rows,
  weightPresets,
  bodyWeight,
  readOnly,
  pending,
  onAddSet,
  onRequestRemove,
}: {
  exerciseName: string;
  exerciseId: string;
  exerciseNotes?: string | null;
  trackingType: TrackingType;
  sets: { id: string; set_number: number }[];
  rows: FlatSetRow[];
  weightPresets: number[];
  bodyWeight: number | null;
  readOnly?: boolean;
  pending: boolean;
  onAddSet: () => void;
  onRequestRemove: (setId: string) => void;
}) {
  const tt = trackingType;
  const showWeightCol =
    tt === "weighted" || tt === "assisted" || tt === "bodyweight";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-2 py-2 dark:border-zinc-800">
        <h2 className="text-base font-bold leading-tight text-zinc-900 dark:text-zinc-50">
          {exerciseName}
        </h2>
        {exerciseNotes ? (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {exerciseNotes}
          </p>
        ) : null}
      </div>
      <div className="w-full min-w-0 overflow-x-hidden">
        <table className="w-full min-w-0 table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
              <th className="sticky left-0 z-10 w-8 bg-zinc-50 py-2 pl-1 pr-1 text-center dark:bg-zinc-800/50">
                #
              </th>
              <th className="min-w-[3rem] py-2 pr-1">
                {tt === "timed" ? "Sec" : "Reps"}
              </th>
              {showWeightCol ? (
                <th className="min-w-[3.5rem] py-2 pr-1">{weightHeader(tt)}</th>
              ) : null}
              <th className="min-w-[4.5rem] py-2 pr-1">RIR</th>
              <th className="min-w-[4.75rem] py-2 pl-2 pr-1 text-right">Vol</th>
              <th className="min-w-[7.5rem] py-2 pl-2 pr-1">Note</th>
              {!readOnly ? <th className="w-8 py-2 text-center" /> : null}
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
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly ? (
        <div className="border-t border-zinc-100 px-2 py-2 dark:border-zinc-800">
          <Button
            variant="secondary"
            type="button"
            className="w-full min-h-10 py-2 text-sm"
            disabled={pending}
            onClick={onAddSet}
          >
            + Set
          </Button>
        </div>
      ) : null}
    </section>
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

  const groups = useMemo(() => groupFlatSets(rows), [rows]);
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
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
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
        <div className="mx-auto max-w-3xl px-0 pt-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{split}</p>
          <h1 className="text-lg font-bold leading-snug text-zinc-900 dark:text-zinc-50">
            {readOnly ? "Workout (completed)" : "Active workout"}
          </h1>
        </div>
      </header>

      {error ? (
        <div className="mx-auto max-w-3xl px-3 pt-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {readOnly ? (
        <WorkoutSummary groups={groups} />
      ) : (
        <div className="mx-auto flex max-w-3xl touch-manipulation flex-col gap-3 px-2 pb-28 pt-2 sm:px-3">
          {groups.map((g) => (
            <ExerciseSetTable
              key={g.exercise_id}
              exerciseName={g.exercise_name}
              exerciseId={g.exercise_id}
              exerciseNotes={
                rows.find((r) => r.exercise_id === g.exercise_id)?.exercise_notes
              }
              trackingType={g.tracking_type}
              sets={g.sets}
              rows={rows}
              weightPresets={
                exerciseWeightPresets.get(g.exercise_id) ?? weightPresets
              }
              bodyWeight={bodyWeight}
              readOnly={readOnly}
              pending={pending}
              onAddSet={() => handleAddSet(g.exercise_id)}
              onRequestRemove={requestRemoveSet}
            />
          ))}
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
