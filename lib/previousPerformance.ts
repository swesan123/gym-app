/**
 * Shared "most recent wins" aggregation for exercise history lookups
 * (previous weight, latest performance for progression). Deliberately takes
 * no split parameter — history follows the exercise by recency alone, so
 * moving an exercise to a new split can't reset its progression or hide a
 * more recent session (#91, #92).
 */

/** Rank of each workout by recency; lower rank = more recent. */
export function rankWorkoutsByRecency(workoutIds: string[]): Map<string, number> {
  const rank = new Map<string, number>();
  workoutIds.forEach((id, idx) => rank.set(id, idx));
  return rank;
}

/** For each `key`, keep the value from the most recent (lowest-rank) workout. */
export function pickMostRecentByKey<T>(
  rows: Array<{ workout_id: string; key: string; value: T }>,
  rankByWorkoutId: Map<string, number>,
): Map<string, T> {
  const best = new Map<string, { rank: number; value: T }>();
  for (const row of rows) {
    const rank = rankByWorkoutId.get(row.workout_id) ?? Number.MAX_SAFE_INTEGER;
    const existing = best.get(row.key);
    if (!existing || rank < existing.rank) {
      best.set(row.key, { rank, value: row.value });
    }
  }
  return new Map([...best.entries()].map(([key, v]) => [key, v.value]));
}

/** For each `exercise_id`, the id of its most recent (lowest-rank) workout. */
export function pickLatestWorkoutPerExercise(
  rows: Array<{ workout_id: string; exercise_id: string }>,
  rankByWorkoutId: Map<string, number>,
): Map<string, string> {
  const best = new Map<string, { rank: number; workoutId: string }>();
  for (const row of rows) {
    const rank = rankByWorkoutId.get(row.workout_id) ?? Number.MAX_SAFE_INTEGER;
    const existing = best.get(row.exercise_id);
    if (!existing || rank < existing.rank) {
      best.set(row.exercise_id, { rank, workoutId: row.workout_id });
    }
  }
  return new Map([...best.entries()].map(([exerciseId, v]) => [exerciseId, v.workoutId]));
}
