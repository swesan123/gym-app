import type { StretchKind } from "@/lib/database.types";

export type ExerciseOrderInfo = {
  id: string;
  stretchKind: StretchKind;
  sortOrder: number;
};

/**
 * Reorders exercises within the skipped exercise's stretch section
 * (dynamic/main/static) so it moves to the end: the remaining exercises in
 * that section are compacted into a contiguous 0..N-1 sequence in their
 * existing relative order, and the skipped exercise is placed after all of
 * them (#93). Exercises outside the section are left untouched.
 */
export function computeSkipOrderUpdates(
  exercises: ExerciseOrderInfo[],
  skippedExerciseId: string,
): { exerciseId: string; sortOrder: number }[] {
  const skipped = exercises.find((e) => e.id === skippedExerciseId);
  if (!skipped) return [];

  const remaining = exercises
    .filter((e) => e.id !== skippedExerciseId && e.stretchKind === skipped.stretchKind)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return [
    ...remaining.map((e, i) => ({ exerciseId: e.id, sortOrder: i })),
    { exerciseId: skippedExerciseId, sortOrder: remaining.length },
  ];
}
