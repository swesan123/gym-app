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

const RIR_QUICK = [0, 1, 2, 3, 4, 5, 6] as const;

function weightLabel(t: TrackingType) {
  if (t === "assisted") return "Assistance";
  if (t === "bodyweight") return "Extra weight";
  return "Weight";
}

function SetRowEditor({
  row,
  weightPresets,
  readOnly,
  onRequestRemove,
}: {
  row: FlatSetRow;
  weightPresets: number[];
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

  return (
    <li className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Set {row.set_number}
        </p>
        {!readOnly ? (
          <Button
            variant="ghost"
            type="button"
            className="min-h-9 px-2 py-1 text-sm text-red-700 dark:text-red-400"
            onClick={() => onRequestRemove(row.id)}
          >
            Remove
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {row.tracking_type === "timed" ? (
          <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Seconds
            <input
              inputMode="decimal"
              disabled={readOnly}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Reps
            <input
              inputMode="decimal"
              disabled={readOnly}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
        )}

        {(row.tracking_type === "weighted" ||
          row.tracking_type === "assisted" ||
          row.tracking_type === "bodyweight") && (
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {weightLabel(row.tracking_type)}
            <input
              inputMode="decimal"
              disabled={readOnly}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              list={readOnly ? undefined : datalistId}
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
            {!readOnly ? (
              <datalist id={datalistId}>
                {weightPresets.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            ) : null}
          </label>
        )}

        {row.tracking_type !== "timed" && (
          <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            RIR
            <div className="flex flex-wrap gap-2">
              <input
                inputMode="decimal"
                disabled={readOnly}
                value={rir}
                onChange={(e) => setRir(e.target.value)}
                className="min-h-11 min-w-[5rem] flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
              {!readOnly ? (
                <div className="flex flex-wrap gap-1">
                  {RIR_QUICK.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRir(String(r))}
                      className="min-h-11 min-w-11 rounded-lg border border-zinc-300 bg-white text-sm font-semibold dark:border-zinc-600 dark:bg-zinc-900"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </label>
        )}

        {row.tracking_type === "timed" && (
          <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            RIR (optional)
            <input
              inputMode="decimal"
              disabled={readOnly}
              value={rir}
              onChange={(e) => setRir(e.target.value)}
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
        )}
      </div>

      <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Note
        <input
          disabled={readOnly}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>

      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Volume:{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {volumeLocal == null ? "—" : Math.round(volumeLocal).toLocaleString()}
        </span>
      </p>

      {!readOnly && weightPresets.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {weightPresets.slice(0, 24).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeight(String(w))}
              className="shrink-0 rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              {w}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function ActiveWorkout({
  workoutId,
  split,
  status,
  rows,
  weightPresets,
}: {
  workoutId: string;
  split: string;
  status: "draft" | "completed";
  rows: FlatSetRow[];
  weightPresets: number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  const groups = useMemo(() => groupFlatSets(rows), [rows]);

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
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <Button
            variant="ghost"
            type="button"
            className="min-h-11 px-2"
            onClick={() => router.push("/")}
          >
            ← Home
          </Button>
          {!readOnly ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => setFinishOpen(true)}
            >
              Finish
            </Button>
          ) : null}
        </div>
        <div className="mx-auto mt-2 max-w-lg">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{split}</p>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {readOnly ? "Workout (completed)" : "Active workout"}
          </h1>
        </div>
      </header>

      {error ? (
        <div className="mx-auto max-w-lg px-4 pt-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {readOnly ? (
        <WorkoutSummary groups={groups} />
      ) : (
        <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-28 pt-4">
          {groups.map((g) => (
            <section
              key={g.exercise_id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {g.exercise_name}
              </h2>
              <ul className="mt-3 space-y-3">
                {g.sets.map((s) => {
                  const flat = rows.find((r) => r.id === s.id);
                  if (!flat) return null;
                  return (
                    <SetRowEditor
                      key={s.id}
                      row={flat}
                      weightPresets={weightPresets}
                      readOnly={readOnly}
                      onRequestRemove={setRemoveTarget}
                    />
                  );
                })}
              </ul>
              <Button
                variant="secondary"
                type="button"
                className="mt-3 w-full"
                disabled={pending}
                onClick={() => handleAddSet(g.exercise_id)}
              >
                Add set
              </Button>
            </section>
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
