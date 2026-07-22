"use client";

import type { FlatSetRow } from "@/components/workout/groupSets";
import { Button } from "@/components/ui/button";
import {
  REPS_PRESETS,
  RIR_PRESETS,
  mergeNumberOptions,
  mergeWeightOptions,
  weightColumnTitle,
  weightHeader,
} from "@/components/workout/setFieldPresets";
import { useSetEditor } from "@/components/workout/useSetEditor";
import { formatDurationSeconds } from "@/lib/duration";
import { useSetElapsed } from "@/lib/useSetElapsed";

export function FocusSetCard({
  row,
  exerciseName,
  weightPresets,
  durationPresets,
  showWeightCol,
  showRirCol,
  bodyWeight,
  totalSetsForExercise,
  setPositionInExercise,
  stepIndex,
  totalSteps,
  onBack,
  onNext,
  onDoneRest,
  onOpenNote,
  onAddSet,
  onSkip,
  onSetCompleted,
  onSetFieldsChange,
}: {
  row: FlatSetRow;
  exerciseName: string;
  weightPresets: number[];
  durationPresets: number[];
  showWeightCol: boolean;
  showRirCol: boolean;
  bodyWeight: number | null;
  totalSetsForExercise: number;
  setPositionInExercise: number;
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onDoneRest: () => void;
  onOpenNote: () => void;
  onAddSet: () => void;
  onSkip: () => void;
  onSetCompleted?: (setId: string, completedAt: string | null) => void;
  onSetFieldsChange?: (
    setId: string,
    fields: { reps: number | null; weight: number | null; rir: number | null; duration_seconds: number | null },
  ) => void;
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
  } = useSetEditor({ row, bodyWeight, onDoneRest, onSetCompleted, onSetFieldsChange });

  const setElapsedSeconds = useSetElapsed(row.started_at, row.completed_at);

  const tt = row.tracking_type;
  const repsOptions = mergeNumberOptions(REPS_PRESETS, reps);
  const weightOptions = mergeWeightOptions(tt, weightPresets, weight);
  const rirOptions = mergeNumberOptions(RIR_PRESETS, rir);
  const durationOptions = mergeNumberOptions(durationPresets, duration);

  const fieldClass =
    "box-border h-12 min-h-12 w-full min-w-0 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-2 text-base dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]";

  const cardBg = isDone
    ? "bg-emerald-50/80 dark:bg-emerald-900/20"
    : "bg-[var(--chalk-white)] dark:bg-[var(--gray-50)]";

  const savedNote = row.note ?? "";

  return (
    <div className="flex flex-col gap-4 px-3 pb-28 pt-2">
      <div className="flex items-center justify-between text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">
        <span>
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <span className="flex items-center gap-2">
          {setElapsedSeconds != null ? (
            <span className="font-data font-semibold tabular-nums text-[var(--gym-amber)]">
              {formatDurationSeconds(setElapsedSeconds)}
            </span>
          ) : null}
          <span>
            Set {setPositionInExercise + 1} of {totalSetsForExercise}
          </span>
        </span>
      </div>

      <div className={`rounded-2xl border border-[var(--gray-200)] p-5 transition-colors dark:border-[var(--gray-100)] ${cardBg}`}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-2xl font-bold leading-tight text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            {exerciseName}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {isDone ? (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                ✓ Done
              </span>
            ) : null}
            <Button
              variant="ghost"
              type="button"
              className="min-h-8 shrink-0 px-2 py-1 text-xs"
              onClick={onSkip}
            >
              Skip →
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {tt === "timed" ? (
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                Time
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={fieldClass}
                  aria-label="Seconds"
                  disabled={isDone}
                >
                  <option value="">—</option>
                  {durationOptions.map((v) => (
                    <option key={`duration-${row.id}-${v}`} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                {timerEndAt != null ? (
                  <span className="font-data w-16 shrink-0 text-center text-2xl font-bold tabular-nums text-[var(--gym-amber)]">
                    {timerRemaining}s
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-12 shrink-0 px-3"
                    disabled={!duration || isDone}
                    onClick={() => startTimer(Number(duration))}
                  >
                    ▶
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                Reps
              </label>
              <select
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className={fieldClass}
                aria-label="Reps"
                disabled={isDone}
              >
                <option value="">—</option>
                {repsOptions.map((v) => (
                  <option key={`reps-${row.id}-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showWeightCol ? (
            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                title={weightColumnTitle(tt)}
              >
                {weightHeader(tt)}
              </label>
              <select
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={fieldClass}
                aria-label={weightHeader(tt)}
                disabled={isDone}
              >
                <option value="">—</option>
                {weightOptions.map((v) => (
                  <option key={`weight-${row.id}-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {showRirCol ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                RIR
              </label>
              <select
                value={rir}
                onChange={(e) => setRir(e.target.value)}
                className={fieldClass}
                aria-label="RIR"
                disabled={isDone}
              >
                <option value="">—</option>
                {rirOptions.map((v) => (
                  <option key={`rir-${row.id}-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end text-sm text-[var(--gray-600)] dark:text-[var(--gray-400)]">
          <button
            type="button"
            onClick={onOpenNote}
            className="max-w-full truncate text-left underline decoration-dotted"
          >
            {savedNote.trim() ? savedNote : "Add note…"}
          </button>
        </div>

        {markDoneError ? (
          <p className="mt-3 text-sm text-red-600">{markDoneError}</p>
        ) : null}

        {isDone ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full py-3 text-base"
            disabled={clearDonePending}
            onClick={handleClearDone}
          >
            {clearDonePending ? "Clearing…" : "Edit"}
          </Button>
        ) : (
          <Button
            type="button"
            className="mt-4 w-full py-3 text-base"
            disabled={!readyToComplete || markDonePending}
            onClick={handleMarkDone}
          >
            {markDonePending ? "Saving…" : "Done"}
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 py-3"
          disabled={stepIndex === 0}
          onClick={onBack}
        >
          ← Back
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 py-3"
          disabled={stepIndex >= totalSteps - 1}
          onClick={onNext}
        >
          Next →
        </Button>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full py-3"
        onClick={onAddSet}
      >
        + Set
      </Button>
    </div>
  );
}
