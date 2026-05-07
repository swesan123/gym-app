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

const REPS_PRESETS = [4, 5, 6, 8, 10, 12, 15, 20];
const RIR_PRESETS = [0, 1, 2, 3, 4];

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
  previousWeight,
  showPreviousWeight,
  showWeightCol,
  bodyWeight,
  readOnly,
  onRequestRemove,
}: {
  row: FlatSetRow;
  weightPresets: number[];
  previousWeight: number | null;
  showPreviousWeight: boolean;
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

  const datalistId = `weights-${row.id}`;
  const repsListId = `reps-${row.id}`;
  const rirListId = `rir-${row.id}`;
  const tt = row.tracking_type;

  const cellInput =
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-zinc-300 bg-white px-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950";

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="sticky left-0 z-10 bg-white py-1 pr-1 text-center text-xs font-semibold tabular-nums dark:bg-zinc-900">
        {row.set_number}
      </td>
      {tt === "timed" ? (
        <td className="py-1 pr-1">
          <input
            inputMode="decimal"
            disabled={readOnly}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={cellInput}
            aria-label="Seconds"
          />
        </td>
      ) : (
        <td className="py-1 pr-1">
          <input
            inputMode="decimal"
            disabled={readOnly}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            list={readOnly ? undefined : repsListId}
            className={cellInput}
            aria-label="Reps"
          />
          {!readOnly ? (
            <datalist id={repsListId}>
              {REPS_PRESETS.map((v) => (
                <option key={`${repsListId}-${v}`} value={v} />
              ))}
            </datalist>
          ) : null}
        </td>
      )}
      {showWeightCol && (
        <td className="py-1 pr-1">
          <input
            inputMode="decimal"
            disabled={readOnly}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            list={readOnly ? undefined : datalistId}
            className={cellInput}
            aria-label={weightHeader(tt)}
          />
          {!readOnly ? (
            <datalist id={datalistId}>
              {weightPresets.map((v, i) => (
                <option key={`${datalistId}-${i}`} value={v} />
              ))}
            </datalist>
          ) : null}
        </td>
      )}
      {showPreviousWeight ? (
        <td className="py-1 pl-2 pr-1 text-right text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
          {previousWeight == null ? "—" : previousWeight.toLocaleString()}
        </td>
      ) : null}
      <td className="py-1 pr-1">
        <input
          inputMode="decimal"
          disabled={readOnly}
          value={rir}
          onChange={(e) => setRir(e.target.value)}
          list={readOnly ? undefined : rirListId}
          className={cellInput}
          aria-label="RIR"
        />
        {!readOnly ? (
          <datalist id={rirListId}>
            {RIR_PRESETS.map((v) => (
              <option key={`${rirListId}-${v}`} value={v} />
            ))}
          </datalist>
        ) : null}
      </td>
      <td className="min-w-[3.5rem] py-1 pl-2 pr-1 text-right text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
        {volumeLocal == null ? "—" : Math.round(volumeLocal).toLocaleString()}
      </td>
      <td className="max-w-[7rem] py-1 pl-2 pr-1 sm:max-w-[10rem]">
        <input
          disabled={readOnly}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={cellInput}
          aria-label="Note"
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
  previousWeights,
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
  previousWeights: Record<string, number>;
  bodyWeight: number | null;
  readOnly?: boolean;
  pending: boolean;
  onAddSet: () => void;
  onRequestRemove: (setId: string) => void;
}) {
  const tt = trackingType;
  const showWeightCol =
    tt === "weighted" || tt === "assisted" || tt === "bodyweight";
  const showPreviousWeight = showWeightCol;

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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-sm">
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
              {showPreviousWeight ? (
                <th className="min-w-[3.25rem] py-2 pl-2 pr-1 text-right">Last</th>
              ) : null}
              <th className="min-w-[2.75rem] py-2 pr-1">RIR</th>
              <th className="min-w-[3.5rem] py-2 pl-2 pr-1 text-right">Vol</th>
              <th className="min-w-[6rem] py-2 pl-2 pr-1">Note</th>
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
                  previousWeight={
                    previousWeights[`${exerciseId}:${flat.set_number}`] ?? null
                  }
                  showPreviousWeight={showPreviousWeight}
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
  previousWeights,
  bodyWeight,
}: {
  workoutId: string;
  split: string;
  status: "draft" | "completed";
  rows: FlatSetRow[];
  weightPresets: number[];
  previousWeights: Record<string, number>;
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
      const machinePresets = buildMachineWeightPresets({
        machineStartWeight: row.machine_start_weight,
        machineEndWeight: row.machine_end_weight,
        machineIncrement: row.machine_increment,
      });
      const merged = [...new Set([...weightPresets, ...machinePresets])].sort(
        (a, b) => a - b,
      );
      map.set(row.exercise_id, merged);
    }
    return map;
  }, [rows, weightPresets]);

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
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-2 pb-28 pt-2 sm:px-3">
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
              previousWeights={previousWeights}
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
