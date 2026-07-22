import type { StretchKind } from "@/lib/database.types";

export type ExerciseOrderInfo = {
  id: string;
  stretchKind: StretchKind;
  /** Current per-workout order (may differ from split catalog after skips). */
  sortOrder: number;
  /** Default order from exercise_splits for this workout's split. */
  splitOrder: number;
};

/**
 * Next exercise in split catalog order within the same stretch section, or null
 * if the skipped exercise is already last in the split.
 */
export function splitCatalogNextExerciseId(
  exercises: ExerciseOrderInfo[],
  skippedExerciseId: string,
): string | null {
  const skipped = exercises.find((e) => e.id === skippedExerciseId);
  if (!skipped) return null;

  const section = exercises.filter((e) => e.stretchKind === skipped.stretchKind);
  const next = section
    .filter((e) => e.splitOrder > skipped.splitOrder)
    .sort((a, b) => a.splitOrder - b.splitOrder)[0];

  return next?.id ?? null;
}

/**
 * Defers the skipped exercise to after the next exercise in split catalog
 * order (within its stretch section). Exercises outside the section are
 * untouched (#93).
 */
export function computeSkipOrderUpdates(
  exercises: ExerciseOrderInfo[],
  skippedExerciseId: string,
): { exerciseId: string; sortOrder: number }[] {
  const skipped = exercises.find((e) => e.id === skippedExerciseId);
  if (!skipped) return [];

  const section = exercises
    .filter((e) => e.stretchKind === skipped.stretchKind)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const nextInSplit = section
    .filter((e) => e.splitOrder > skipped.splitOrder)
    .sort((a, b) => a.splitOrder - b.splitOrder)[0];

  if (!nextInSplit) {
    return section.map((e, i) => ({ exerciseId: e.id, sortOrder: i }));
  }

  const reordered = section.filter((e) => e.id !== skippedExerciseId);
  const insertAfterIdx = reordered.findIndex((e) => e.id === nextInSplit.id);
  reordered.splice(insertAfterIdx + 1, 0, skipped);

  return reordered.map((e, i) => ({ exerciseId: e.id, sortOrder: i }));
}

/** One entry per exercise from workout set rows (for skip focus / reorder). */
export function buildExerciseOrderInfoFromRows(
  rows: Array<{
    exercise_id: string;
    stretch_kind: StretchKind;
    sort_order: number;
    split_catalog_order: number;
  }>,
): ExerciseOrderInfo[] {
  const byExercise = new Map<string, ExerciseOrderInfo>();
  for (const row of rows) {
    if (byExercise.has(row.exercise_id)) continue;
    byExercise.set(row.exercise_id, {
      id: row.exercise_id,
      stretchKind: row.stretch_kind,
      sortOrder: row.sort_order,
      splitOrder: row.split_catalog_order,
    });
  }
  return [...byExercise.values()];
}
