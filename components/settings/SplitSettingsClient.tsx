"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { createSplit, deleteSplit, reorderSplit, renameSplit, archiveSplit, restoreSplit } from "@/app/actions/splits";
import { setExerciseOrder } from "@/app/actions/exercises";
import type { WorkoutSplitRow } from "@/lib/queries/read";
import type { StretchKind } from "@/lib/database.types";
import { SplitsMigrationBanner } from "@/components/SplitsMigrationBanner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ExerciseWithSplits = {
  id: string;
  name: string;
  stretch_kind: StretchKind;
  exercise_splits: Array<{ split_name: string; sort_order: number }>;
};

function SortableExerciseItem({
  exercise,
  pending,
}: {
  exercise: ExerciseWithSplits;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center justify-between gap-2 rounded-lg bg-[var(--gray-50)] px-3 py-2 dark:bg-[var(--gray-100)]/50"
    >
      <span className="text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
        {exercise.name}
      </span>
      <button
        type="button"
        disabled={pending}
        className="touch-none select-none cursor-grab active:cursor-grabbing rounded p-1 text-[var(--gray-400)] hover:text-[var(--gray-600)] disabled:opacity-40 dark:text-[var(--gray-500)] dark:hover:text-[var(--gray-300)]"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
    </li>
  );
}

function ExerciseSection({
  title,
  exercises: initialExercises,
  splitName,
  pending,
  onReorderSection,
}: {
  title: string;
  exercises: ExerciseWithSplits[];
  splitName: string;
  pending: boolean;
  onReorderSection: (splitName: string, orderedIds: string[]) => void;
}) {
  const [exercises, setExercises] = useState(initialExercises);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setExercises((items) => {
      const oldIdx = items.findIndex((e) => e.id === active.id);
      const newIdx = items.findIndex((e) => e.id === over.id);
      const reordered = arrayMove(items, oldIdx, newIdx);
      onReorderSection(splitName, reordered.map((e) => e.id));
      return reordered;
    });
  };

  return (
    <div className="px-4 py-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:text-[var(--gray-400)]">
        {title}
      </h4>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={exercises.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-2 space-y-2">
            {exercises.map((ex) => (
              <SortableExerciseItem key={ex.id} exercise={ex} pending={pending} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function SplitSettingsClient({
  splits: initialSplits,
  archivedSplits,
  exercises: allExercises,
  splitsTableReady,
}: {
  splits: WorkoutSplitRow[];
  archivedSplits: WorkoutSplitRow[];
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
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const onReorderSection = (splitName: string, orderedIds: string[]) => {
    startTransition(async () => {
      try {
        setError(null);
        await setExerciseOrder(splitName, orderedIds);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reorder");
      }
    });
  };

  const onRestore = (id: string) => {
    startTransition(async () => {
      try {
        setError(null);
        await restoreSplit(id);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not restore");
      }
    });
  };

  const onConfirmArchive = () => {
    const id = archiveId;
    if (!id) return;
    setArchiveId(null);
    startTransition(async () => {
      try {
        setError(null);
        await archiveSplit(id);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not archive");
      }
    });
  };

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
            Organize exercises by split. Reorder splits with ↑ / ↓. Manage exercise properties under{" "}
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
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base disabled:opacity-60 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]"
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
            const idx = initialSplits.findIndex((x) => x.id === s.id);
            const canMoveUp = idx > 0;
            const canMoveDown = idx < initialSplits.length - 1;

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
              <div key={s.id} className="overflow-hidden rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]">
                {/* Split header */}
                <div className="flex items-center justify-between gap-2 border-b border-[var(--gray-200)] px-4 py-3 dark:border-[var(--gray-200)]">
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
                        className="min-h-9 w-full rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-2 text-sm dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)]"
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
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={pending || !splitsTableReady}
                          className="min-h-9 text-[var(--gray-500)] dark:text-[var(--gray-400)]"
                          onClick={() => setArchiveId(s.id)}
                        >
                          Archive
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={pending || !splitsTableReady}
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
                      <ExerciseSection
                        key={groupedExercises.dynamic.map((e) => e.id).join(",")}
                        title="Dynamic stretches"
                        exercises={groupedExercises.dynamic}
                        splitName={s.name}
                        pending={pending}
                        onReorderSection={onReorderSection}
                      />
                    )}
                    {groupedExercises.main.length > 0 && (
                      <ExerciseSection
                        key={groupedExercises.main.map((e) => e.id).join(",")}
                        title="Exercises"
                        exercises={groupedExercises.main}
                        splitName={s.name}
                        pending={pending}
                        onReorderSection={onReorderSection}
                      />
                    )}
                    {groupedExercises.static.length > 0 && (
                      <ExerciseSection
                        key={groupedExercises.static.map((e) => e.id).join(",")}
                        title="Static stretches"
                        exercises={groupedExercises.static}
                        splitName={s.name}
                        pending={pending}
                        onReorderSection={onReorderSection}
                      />
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

        {archivedSplits.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Archived splits
            </h2>
            <p className="mt-1 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
              These splits are hidden from Start workout. Restore to bring them back.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {archivedSplits.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] px-4 py-3 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]"
                >
                  <span className="text-sm font-medium text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                    {s.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    className="text-sm text-[var(--gym-amber)] dark:text-orange-400"
                    onClick={() => onRestore(s.id)}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={!!archiveId}
        title="Archive split?"
        description="Archived splits are hidden from the Start workout screen but your workout history is preserved. You can restore them later."
        confirmLabel="Archive split"
        onCancel={() => setArchiveId(null)}
        onConfirm={onConfirmArchive}
      />

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
