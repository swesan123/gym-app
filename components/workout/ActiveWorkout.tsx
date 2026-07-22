"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addWorkoutSet,
  fetchWorkoutSetRows,
  finishWorkout,
  markSetStarted,
  removeWorkoutSet,
  skipExerciseInWorkout,
  updateWorkoutSet,
} from "@/app/actions/workouts";
import { buildExerciseDurationPresetsMap } from "@/components/workout/buildExerciseDurationPresets";
import { buildExerciseWeightPresetsMap } from "@/components/workout/buildExerciseWeightPresets";
import { ExerciseSetTable } from "@/components/workout/ExerciseSetTable";
import { FocusSetCard } from "@/components/workout/FocusSetCard";
import type { FlatSetRow } from "@/components/workout/groupSets";
import { partitionGroupsByStretchKind } from "@/components/workout/partitionGroupsByStretchKind";
import { useFocusNavigation } from "@/components/workout/useFocusNavigation";
import { useRestTimer } from "@/components/workout/useRestTimer";
import { DURATION_PRESETS } from "@/components/workout/setFieldPresets";
import { useWorkoutRows } from "@/components/workout/useWorkoutRows";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { canRemoveWorkoutSet } from "@/lib/canRemoveWorkoutSet";
import { clampWorkoutElapsedSeconds, formatDurationSeconds } from "@/lib/duration";
import { getFinishModalState } from "@/lib/setCompletion";
import { useWorkoutElapsed } from "@/lib/useWorkoutElapsed";

const VIEW_MODE_STORAGE_PREFIX = "gym-app:viewMode:";

type ViewMode = "list" | "focus";

export function ActiveWorkout({
  workoutId,
  split,
  status,
  workoutCreatedAt,
  rows,
  weightPresets,
  exercisePresetMap,
  bodyWeight,
}: {
  workoutId: string;
  split: string;
  status: "draft" | "completed";
  workoutCreatedAt: string;
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
  const [focusNoteTarget, setFocusNoteTarget] = useState<{
    setId: string;
    draft: string;
  } | null>(null);

  const readOnly = status === "completed";
  const viewModeStorageKey = `${VIEW_MODE_STORAGE_PREFIX}${workoutId}`;

  const workoutStartAt = useMemo(
    () => new Date(workoutCreatedAt).getTime(),
    [workoutCreatedAt],
  );
  const elapsedSeconds = useWorkoutElapsed(readOnly ? null : workoutStartAt);

  const {
    localRows,
    applyServerRows,
    updateRowNote,
    updateRowCompletion,
    updateRowFields,
    updateRowsSortOrder,
    removeRow,
    addRow,
  } = useWorkoutRows(rows);

  const {
    groups,
    focusStep,
    focusRow,
    focusGroup,
    clampedFocusIndex,
    focusSteps,
    setFocusIndex,
  } = useFocusNavigation(localRows, workoutId, readOnly);

  // When rest ends (naturally or skipped), stamp the next incomplete set's
  // started_at so its elapsed time in history reflects when it became
  // available rather than whenever the user gets around to editing it (#95).
  const markNextSetStarted = () => {
    if (readOnly) return;
    const next = focusSteps.find((step) => {
      const row = localRows.find((r) => r.id === step.setId);
      return row && row.set_type !== "warmup" && row.completed_at == null;
    });
    if (!next) return;
    void markSetStarted(next.setId).catch(() => {
      // Best-effort — only affects the per-set duration shown in history.
    });
  };

  const {
    restEndAt,
    restLabel,
    restRemaining,
    startRestTimer,
    stopRestTimer,
  } = useRestTimer(workoutId, readOnly, markNextSetStarted);

  const restTriggeredSetIdsRef = useRef<Set<string>>(new Set());
  const skippedExerciseRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const raw = window.sessionStorage.getItem(viewModeStorageKey);
    return raw === "focus" ? "focus" : "list";
  });

  const finishModalState = useMemo(
    () => getFinishModalState(localRows),
    [localRows],
  );

  const exerciseWeightPresets = useMemo(
    () =>
      buildExerciseWeightPresetsMap(rows, weightPresets, exercisePresetMap),
    [rows, weightPresets, exercisePresetMap],
  );

  const exerciseDurationPresets = useMemo(
    () => buildExerciseDurationPresetsMap(rows),
    [rows],
  );

  const setViewModePersisted = (mode: ViewMode) => {
    setViewMode(mode);
    window.sessionStorage.setItem(viewModeStorageKey, mode);
  };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || readOnly) return;
      void fetchWorkoutSetRows(workoutId)
        .then(applyServerRows)
        .catch(() => {
          // Ignore transient fetch failures on tab return.
        });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [workoutId, readOnly, applyServerRows]);

  // After skipping an exercise in Focus mode, land on the next incomplete
  // step once the reordered `focusSteps` reflects the skip (#93). Prefers a
  // step outside the skipped exercise; falls back to it if nothing else is
  // left to do.
  useEffect(() => {
    const skippedId = skippedExerciseRef.current;
    if (!skippedId) return;
    skippedExerciseRef.current = null;

    const isIncomplete = (setId: string) => {
      const row = localRows.find((r) => r.id === setId);
      return !!row && row.set_type !== "warmup" && row.completed_at == null;
    };

    let nextIndex = focusSteps.findIndex(
      (step) => step.exerciseId !== skippedId && isIncomplete(step.setId),
    );
    if (nextIndex < 0) {
      nextIndex = focusSteps.findIndex((step) => isIncomplete(step.setId));
    }
    if (nextIndex >= 0) setFocusIndex(nextIndex);
  }, [focusSteps, localRows, setFocusIndex]);

  const onConfirmRemove = () => {
    if (!removeTarget) return;
    const id = removeTarget;
    const removedRow = localRows.find((r) => r.id === id);

    removeRow(id);
    setRemoveTarget(null);

    startTransition(async () => {
      try {
        await removeWorkoutSet(id, workoutId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove set");
        if (removedRow) {
          addRow(removedRow);
        }
      }
    });
  };

  const requestRemoveSet = (setId: string) => {
    if (!canRemoveWorkoutSet(localRows, setId)) {
      setError(
        "Cannot remove the last set for this exercise. Add another set first.",
      );
      return;
    }
    window.setTimeout(() => setRemoveTarget(setId), 0);
  };

  const onFinish = () => {
    const state = getFinishModalState(localRows);
    if (!state.canFinish) {
      setError(state.description);
      setViewModePersisted("list");
      return;
    }

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
        const newRow = await addWorkoutSet(workoutId, exerciseId);
        addRow(newRow);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add set");
      }
    });
  };

  const handleSkipExercise = (exerciseId: string) => {
    if (viewMode === "focus") {
      skippedExerciseRef.current = exerciseId;
    }
    startTransition(async () => {
      try {
        const updates = await skipExerciseInWorkout(workoutId, exerciseId);
        updateRowsSortOrder(updates);
      } catch (e) {
        skippedExerciseRef.current = null;
        setError(e instanceof Error ? e.message : "Could not skip exercise");
      }
    });
  };

  const handleDoneRest = (
    setId: string,
    restSeconds: number | null,
    exerciseName: string,
    isLastSetOfExercise: boolean,
  ) => {
    if (restTriggeredSetIdsRef.current.has(setId)) return;
    if (isLastSetOfExercise || restSeconds == null || restSeconds <= 0) return;
    restTriggeredSetIdsRef.current.add(setId);
    startRestTimer(restSeconds, exerciseName);
  };

  const focusOnDoneRest = () => {
    if (!focusStep || !focusGroup) return;
    handleDoneRest(
      focusStep.setId,
      focusGroup.rest_seconds,
      focusGroup.exercise_name,
      focusStep.isLastSetOfExercise,
    );
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
            <p className="text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">
              {split}
            </p>
            <h1 className="text-lg font-bold leading-snug text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              {readOnly ? "Workout (completed)" : "Active workout"}
            </h1>
            {!readOnly ? (
              <p className="font-data text-xs font-semibold tabular-nums text-[var(--gym-amber)]">
                {formatDurationSeconds(clampWorkoutElapsedSeconds(elapsedSeconds))}
                {restEndAt != null && restRemaining > 0 ? (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                    · Rest {restRemaining}s
                  </span>
                ) : null}
              </p>
            ) : null}
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
        <div className="px-3 pt-2 text-sm text-red-600">{error}</div>
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
            durationPresets={
              exerciseDurationPresets.get(focusStep.exerciseId) ?? DURATION_PRESETS
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
            onNext={() =>
              setFocusIndex((i) => Math.min(i + 1, focusSteps.length - 1))
            }
            onDoneRest={focusOnDoneRest}
            onOpenNote={() =>
              setFocusNoteTarget({
                setId: focusRow.id,
                draft: focusRow.note ?? "",
              })
            }
            onAddSet={() => handleAddSet(focusStep.exerciseId)}
            onSkip={() => handleSkipExercise(focusStep.exerciseId)}
            onSetCompleted={updateRowCompletion}
            onSetFieldsChange={updateRowFields}
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
                        durationPresets={
                          exerciseDurationPresets.get(g.exercise_id) ??
                          DURATION_PRESETS
                        }
                        bodyWeight={bodyWeight}
                        readOnly={readOnly}
                        pending={pending}
                        restSeconds={g.rest_seconds}
                        onAddSet={() => handleAddSet(g.exercise_id)}
                        onSkip={() => handleSkipExercise(g.exercise_id)}
                        onRequestRemove={requestRemoveSet}
                        onUpdateNote={updateRowNote}
                        onError={setError}
                        onDoneRest={handleDoneRest}
                        onSetCompleted={updateRowCompletion}
                        onSetFieldsChange={updateRowFields}
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
        description="Removes this set row from today's workout only. The exercise stays in your split settings."
        variant="danger"
        confirmLabel="Remove set"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={onConfirmRemove}
      />

      <Modal
        open={finishOpen}
        title={finishModalState.title}
        description={finishModalState.description}
        confirmLabel={finishModalState.confirmLabel}
        confirmDisabled={!finishModalState.canFinish}
        onCancel={() => setFinishOpen(false)}
        onConfirm={() => {
          if (!finishModalState.canFinish) return;
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
              setError(
                err instanceof Error ? err.message : "Failed to save note",
              );
            });
          }}
        >
          <textarea
            value={focusNoteTarget?.draft ?? ""}
            onChange={(e) =>
              setFocusNoteTarget((n) =>
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
