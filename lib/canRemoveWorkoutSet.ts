export function canRemoveWorkoutSet(
  rows: { id: string; exercise_id: string }[],
  setId: string,
): boolean {
  const row = rows.find((r) => r.id === setId);
  if (!row) return false;
  const setsForExercise = rows.filter(
    (r) => r.exercise_id === row.exercise_id,
  ).length;
  return setsForExercise > 1;
}
