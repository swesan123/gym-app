import type { FlatSetRow } from "@/components/workout/groupSets";
import type { TrackingType } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export async function fetchSetsForWorkout(
  workoutId: string,
): Promise<FlatSetRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      `
      id,
      exercise_id,
      set_number,
      reps,
      weight,
      rir,
      duration_seconds,
      volume,
      note,
      exercises (
        name,
        tracking_type
      )
    `,
    )
    .eq("workout_id", workoutId);

  if (error) throw new Error(error.message);

  const rows: FlatSetRow[] = (data ?? []).map((row) => {
    const ex = row.exercises as unknown as {
      name: string;
      tracking_type: TrackingType;
    } | null;

    return {
      id: row.id,
      exercise_id: row.exercise_id,
      set_number: row.set_number,
      reps: row.reps,
      weight: row.weight,
      rir: row.rir,
      duration_seconds: row.duration_seconds,
      volume: row.volume,
      note: row.note,
      exercise_name: ex?.name ?? "Unknown",
      tracking_type: (ex?.tracking_type ?? "weighted") as TrackingType,
    };
  });

  rows.sort(
    (a, b) =>
      a.exercise_name.localeCompare(b.exercise_name) || a.set_number - b.set_number,
  );

  return rows;
}

export async function fetchGlobalWeightPresets(): Promise<number[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("weight_options")
    .select("value")
    .is("exercise_id", null)
    .order("value", { ascending: true });

  if (error) throw new Error(error.message);

  return data?.map((r) => Number(r.value)) ?? [];
}
