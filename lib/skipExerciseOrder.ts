import type { StretchKind } from "@/lib/database.types";

export type ExerciseOrderInfo = {
  id: string;
  stretchKind: StretchKind;
  sortOrder: number;
};

/**
 * Swaps the skipped exercise one position forward within its stretch section
 * (dynamic/main/static). Exercises outside the section are left untouched (#93).
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

  const idx = section.findIndex((e) => e.id === skippedExerciseId);
  if (idx < 0) return [];
  if (idx >= section.length - 1) {
    return section.map((e, i) => ({ exerciseId: e.id, sortOrder: i }));
  }

  const reordered = [...section];
  [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
  return reordered.map((e, i) => ({ exerciseId: e.id, sortOrder: i }));
}
