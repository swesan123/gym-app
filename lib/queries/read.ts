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
        tracking_type,
        notes,
        machine_start_weight,
        machine_end_weight,
        machine_increment
      )
    `,
    )
    .eq("workout_id", workoutId);

  if (error) throw new Error(error.message);

  const rows: FlatSetRow[] = (data ?? []).map((row) => {
    const ex = row.exercises as unknown as {
      name: string;
      tracking_type: TrackingType;
      notes: string | null;
      machine_start_weight: number | null;
      machine_end_weight: number | null;
      machine_increment: number | null;
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
      exercise_notes: ex?.notes ?? null,
      machine_start_weight: ex?.machine_start_weight ?? null,
      machine_end_weight: ex?.machine_end_weight ?? null,
      machine_increment: ex?.machine_increment ?? null,
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

export async function fetchBodyWeight(): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_training_profile")
    .select("body_weight")
    .eq("singleton", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.body_weight == null ? null : Number(data.body_weight);
}

export async function fetchPreviousWeightsForWorkout(
  workoutId: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data: workout, error: workoutErr } = await supabase
    .from("workouts")
    .select("id, date")
    .eq("id", workoutId)
    .single();
  if (workoutErr || !workout) {
    throw new Error(workoutErr?.message ?? "Workout not found");
  }

  const { data: currentSets, error: currentErr } = await supabase
    .from("workout_sets")
    .select("exercise_id, set_number")
    .eq("workout_id", workoutId);
  if (currentErr) throw new Error(currentErr.message);

  const exerciseIds = [
    ...new Set((currentSets ?? []).map((s) => s.exercise_id).filter(Boolean)),
  ];
  if (!exerciseIds.length) return {};

  const { data: completedWorkouts, error: completedErr } = await supabase
    .from("workouts")
    .select("id, date, created_at")
    .eq("status", "completed")
    .lt("date", workout.date)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);
  if (completedErr) throw new Error(completedErr.message);

  const workoutIds = (completedWorkouts ?? []).map((w) => w.id);
  if (!workoutIds.length) return {};

  const rankByWorkoutId = new Map<string, number>();
  workoutIds.forEach((id, idx) => rankByWorkoutId.set(id, idx));

  const { data: previousSetRows, error: previousErr } = await supabase
    .from("workout_sets")
    .select("workout_id, exercise_id, set_number, weight")
    .in("workout_id", workoutIds)
    .in("exercise_id", exerciseIds)
    .not("weight", "is", null);
  if (previousErr) throw new Error(previousErr.message);

  const best = new Map<
    string,
    {
      rank: number;
      weight: number;
    }
  >();

  for (const row of previousSetRows ?? []) {
    const key = `${row.exercise_id}:${row.set_number}`;
    const rank = rankByWorkoutId.get(row.workout_id) ?? Number.MAX_SAFE_INTEGER;
    const weight = Number(row.weight);
    const existing = best.get(key);
    if (!existing || rank < existing.rank) {
      best.set(key, { rank, weight });
    }
  }

  return Object.fromEntries(
    [...best.entries()].map(([key, value]) => [key, value.weight]),
  );
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
