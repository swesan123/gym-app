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

  const nums = (data ?? []).map((r) => Number(r.value));
  // Seed may be applied more than once; dedupe so list keys stay unique.
  return [...new Set(nums)].sort((a, b) => a - b);
}

export type WorkoutSplitRow = { id: string; name: string };

/** PostgREST / Supabase when `workout_splits` does not exist yet */
export function isWorkoutSplitsTableUnavailable(error: {
  message?: string;
  code?: string;
}): boolean {
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("workout_splits") && msg.includes("schema cache")) return true;
  if (msg.includes("could not find") && msg.includes("workout_splits")) return true;
  if (
    msg.includes("relation") &&
    msg.includes("workout_splits") &&
    msg.includes("does not exist")
  ) {
    return true;
  }
  return false;
}

export type SplitsCatalog = {
  splits: WorkoutSplitRow[];
  /** False until migration `20250508120000_splits_catalog_drop_workout_type.sql` is applied */
  splitsTableReady: boolean;
};

export async function fetchSplitsCatalog(): Promise<SplitsCatalog> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_splits")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!error) {
    return { splits: data ?? [], splitsTableReady: true };
  }

  if (!isWorkoutSplitsTableUnavailable(error)) {
    throw new Error(error.message);
  }

  const { data: rows, error: exErr } = await supabase
    .from("exercises")
    .select("split");

  if (exErr) throw new Error(exErr.message);

  const names = [
    ...new Set((rows ?? []).map((r) => r.split).filter(Boolean)),
  ].sort((a, b) => String(a).localeCompare(String(b)));

  return {
    splits: names.map((name, i) => ({
      id: `fallback-split-${i}-${name}`,
      name: String(name),
    })),
    splitsTableReady: false,
  };
}

/** Prefer {@link fetchSplitsCatalog} when you need `splitsTableReady`. */
export async function fetchWorkoutSplits(): Promise<WorkoutSplitRow[]> {
  const { splits } = await fetchSplitsCatalog();
  return splits;
}
