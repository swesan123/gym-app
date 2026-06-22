"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createSplit, deleteSplit, reorderSplit, renameSplit } from "@/app/actions/splits";
import type { WorkoutSplitRow } from "@/lib/queries/read";
import type { StretchKind } from "@/lib/database.types";
import { UNASSIGNED_SPLIT_NAME } from "@/lib/constants";
import { SplitsMigrationBanner } from "@/components/SplitsMigrationBanner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ExerciseWithSplits = {
  id: string;
  name: string;
  stretch_kind: StretchKind;
  exercise_splits: Array<{ split_name: string; sort_order: number }>;
};

function ExerciseSection({
  title,
  exercises,
}: {
  title: string;
  exercises: ExerciseWithSplits[];
}) {
  return (
    <div className="px-4 py-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:text-[var(--gray-400)]">
        {title}
      </h4>
      <ul className="mt-2 space-y-2">
        {exercises.map((ex) => (
          <li key={ex.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--gray-50)] px-3 py-2 dark:bg-[var(--gray-800)]/50">
            <span className="text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">{ex.name}</span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                className="min-h-8 min-w-8 px-0 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                disabled
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-8 min-w-8 px-0 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                disabled
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-8 shrink-0 text-sm text-[var(--muted-red)] dark:text-red-400"
                disabled
              >
                ✕
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SplitSettingsClient({
  splits: initialSplits,
  exercises: allExercises,
  splitsTableReady,
}: {
  splits: WorkoutSplitRow[];
  exercises: ExerciseWithSplits[];
  splitsTableReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const refresh = () => router.refresh();

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    startTransition(async () => {
      try {
        setError(null);
        await createSplit(name);
        setNewName("");
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add split");
      }
    });
  };

  const onConfirmDelete = () => {
    const id = deleteId;
    if (!id) return;
    setDeleteId(null);
    startTransition(async () => {
      try {
        setError(null);
        await deleteSplit(id);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete");
      }
    });
  };

  const onConfirmRename = () => {
    const id = renamingId;
    if (!id || !renameValue.trim()) return;
    startTransition(async () => {
      try {
        setError(null);
        await renameSplit(id, renameValue);
        setRenamingId(null);
        setRenameValue("");
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not rename");
      }
    });
  };

  return (
    <>
      <div className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          href="/settings/exercises"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--gym-amber)] hover:text-orange-600"
        >
          ← Exercises
        </Link>

        <div className="mt-6 mb-8">
          <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
            Splits
          </h1>
          <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
            Organize exercises by split. Reorder splits with ↑ / ↓. The{" "}
            <span className="font-medium">{UNASSIGNED_SPLIT_NAME}</span> split is for parking exercises and does not appear on Start workout. Manage exercise properties like name, muscle, and notes under{" "}
            <Link href="/settings/exercises" className="font-medium text-[var(--gym-amber)] underline">
              Exercises
            </Link>
            .
          </p>
        </div>

        {!splitsTableReady ? <SplitsMigrationBanner className="mt-4" /> : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={onAdd}
          className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            New split name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Push / Pull / Legs"
              disabled={!splitsTableReady || pending}
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base disabled:opacity-60 dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            />
          </label>
          <Button
            type="submit"
            disabled={pending || !newName.trim() || !splitsTableReady}
          >
            Add
          </Button>
        </form>

        <div className="mt-8 flex flex-col gap-6">
          {initialSplits.map((s) => {
            const isUnassigned = s.name === UNASSIGNED_SPLIT_NAME;
            const movable = initialSplits.filter((x) => x.name !== UNASSIGNED_SPLIT_NAME);
            const movableIdx = movable.findIndex((x) => x.id === s.id);
            const canMoveUp = !isUnassigned && movableIdx > 0;
            const canMoveDown =
              !isUnassigned &&
              movableIdx >= 0 &&
              movableIdx < movable.length - 1;

            // Get exercises for this split
            const splitExercises = allExercises
              .filter((ex) => ex.exercise_splits.some((es) => es.split_name === s.name))
              .sort((a, b) => {
                const aSort = a.exercise_splits.find((es) => es.split_name === s.name)?.sort_order ?? Infinity;
                const bSort = b.exercise_splits.find((es) => es.split_name === s.name)?.sort_order ?? Infinity;
                return aSort - bSort || a.name.localeCompare(b.name);
              });

            // Group exercises by stretch category
            const groupedExercises = {
              dynamic: splitExercises.filter((ex) => ex.stretch_kind === "dynamic"),
              main: splitExercises.filter((ex) => ex.stretch_kind === "none"),
              static: splitExercises.filter((ex) => ex.stretch_kind === "static"),
            };

            return (
              <div key={s.id} className="overflow-hidden rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]">
                {/* Split header */}
                <div className="flex items-center justify-between gap-2 border-b border-[var(--gray-200)] px-4 py-3 dark:border-[var(--gray-700)]">
                  <div className="flex-1">
                    {renamingId === s.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onConfirmRename();
                          if (e.key === "Escape") {
                            setRenamingId(null);
                            setRenameValue("");
                          }
                        }}
                        placeholder={s.name}
                        disabled={pending}
                        className="min-h-9 w-full rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-2 text-sm dark:border-[var(--gray-700)] dark:bg-[var(--gray-800)]"
                      />
                    ) : (
                      <h3 className="font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">{s.name}</h3>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {renamingId === s.id ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={pending || !renameValue.trim()}
                          className="min-h-9 text-[var(--gym-amber)] dark:text-orange-400"
                          onClick={onConfirmRename}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={pending}
                          className="min-h-9 text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                          onClick={() => {
                            setRenamingId(null);
                            setRenameValue("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        {!isUnassigned ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={pending || !splitsTableReady || !canMoveUp}
                              className="min-h-9 min-w-9 px-0 text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                              aria-label="Move split up"
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    setError(null);
                                    await reorderSplit(s.id, "up");
                                    refresh();
                                  } catch (err) {
                                    setError(
                                      err instanceof Error ? err.message : "Could not reorder",
                                    );
                                  }
                                });
                              }}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={pending || !splitsTableReady || !canMoveDown}
                              className="min-h-9 min-w-9 px-0 text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                              aria-label="Move split down"
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    setError(null);
                                    await reorderSplit(s.id, "down");
                                    refresh();
                                  } catch (err) {
                                    setError(
                                      err instanceof Error ? err.message : "Could not reorder",
                                    );
                                  }
                                });
                              }}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={pending || !splitsTableReady}
                              className="min-h-9 text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                              onClick={() => {
                                setRenamingId(s.id);
                                setRenameValue(s.name);
                              }}
                            >
                              ✎
                            </Button>
                          </>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={pending || !splitsTableReady || isUnassigned}
                          className="min-h-9 shrink-0 text-[var(--muted-red)] dark:text-red-400"
                          onClick={() => setDeleteId(s.id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Exercise sections */}
                {splitExercises.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">No exercises in this split</p>
                ) : (
                  <div className="divide-y divide-[var(--gray-100)] dark:divide-[var(--gray-800)]">
                    {groupedExercises.dynamic.length > 0 && (
                      <ExerciseSection title="Dynamic stretches" exercises={groupedExercises.dynamic} />
                    )}
                    {groupedExercises.main.length > 0 && (
                      <ExerciseSection title="Exercises" exercises={groupedExercises.main} />
                    )}
                    {groupedExercises.static.length > 0 && (
                      <ExerciseSection title="Static stretches" exercises={groupedExercises.static} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {initialSplits.length === 0 ? (
          <p className="mt-6 text-center text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
            No splits yet. Add one above.
          </p>
        ) : null}

        <p className="mt-8 text-center text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Start logging from{" "}
          <Link href="/workout/start" className="font-medium text-[var(--gym-amber)] underline">
            Start workout
          </Link>
          .
        </p>
      </div>

      <Modal
        open={!!deleteId}
        title="Delete split?"
        description="Only splits that are not used by any exercises or saved workouts can be removed."
        variant="danger"
        confirmLabel="Delete split"
        onCancel={() => setDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
