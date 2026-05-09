import type { StretchKind, TrackingType } from "@/lib/database.types";

import type { SummaryExercise, SummarySet } from "@/components/workout/WorkoutSummary";

export type FlatSetRow = SummarySet & {
  exercise_id: string;
  exercise_name: string;
  tracking_type: TrackingType;
  stretch_kind: StretchKind;
  sort_order: number;
  exercise_notes?: string | null;
  machine_start_weight?: number | null;
  machine_end_weight?: number | null;
  machine_increment?: number | null;
};

function stretchSectionRank(kind: StretchKind): number {
  if (kind === "dynamic") return 0;
  if (kind === "static") return 2;
  return 1;
}

export function groupFlatSets(rows: FlatSetRow[]): SummaryExercise[] {
  const sorted = [...rows].sort((a, b) => {
    const sec =
      stretchSectionRank(a.stretch_kind) - stretchSectionRank(b.stretch_kind);
    if (sec !== 0) return sec;
    const ord = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (ord !== 0) return ord;
    const name = a.exercise_name.localeCompare(b.exercise_name);
    if (name !== 0) return name;
    return a.set_number - b.set_number;
  });

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

  const orderedIds = [
    ...new Map(sorted.map((r) => [r.exercise_id, r])).keys(),
  ];
  const byId = new Map(map.entries());
  return orderedIds
    .map((id) => byId.get(id))
    .filter((g): g is SummaryExercise => g != null);
}
