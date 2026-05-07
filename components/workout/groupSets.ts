import type { TrackingType } from "@/lib/database.types";

import type { SummaryExercise, SummarySet } from "@/components/workout/WorkoutSummary";

export type FlatSetRow = SummarySet & {
  exercise_id: string;
  exercise_name: string;
  tracking_type: TrackingType;
  exercise_notes?: string | null;
  machine_start_weight?: number | null;
  machine_end_weight?: number | null;
  machine_increment?: number | null;
};

export function groupFlatSets(rows: FlatSetRow[]): SummaryExercise[] {
  const sorted = [...rows].sort(
    (a, b) =>
      a.exercise_name.localeCompare(b.exercise_name) ||
      a.set_number - b.set_number,
  );

  const map = new Map<string, SummaryExercise>();
  for (const r of sorted) {
    const {
      exercise_id,
      exercise_name,
      tracking_type,
      id,
      set_number,
      reps,
      weight,
      rir,
      duration_seconds,
      volume,
      note,
    } = r;

    const existing = map.get(exercise_id);
    const set: SummarySet = {
      id,
      set_number,
      reps,
      weight,
      rir,
      duration_seconds,
      volume,
      note,
    };

    if (!existing) {
      map.set(exercise_id, {
        exercise_id,
        exercise_name,
        tracking_type,
        sets: [set],
      });
    } else {
      existing.sets.push(set);
    }
  }

  return [...map.values()];
}
