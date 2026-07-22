import type { FlatSetRow } from "@/components/workout/groupSets";
import type { TrackingType } from "@/lib/database.types";
import { pickMostRecentByKey, rankWorkoutsByRecency } from "@/lib/previousPerformance";
import { createClient } from "@/lib/supabase/server";

export async function fetchSetsForWorkout(
  workoutId: string,
  workoutSplit?: string,
): Promise<FlatSetRow[]> {
  const supabase = await createClient();

  const [{ data, error }, splitOrderData, workoutOrderData] = await Promise.all([
    supabase
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
        set_type,
        completed_at,
        started_at,
        exercises (
          name,
          tracking_type,
          notes,
          machine_start_weight,
          machine_end_weight,
          machine_increment,
          duration_start_seconds,
          duration_end_seconds,
          duration_step_seconds,
          stretch_kind,
          sort_order,
          rest_seconds
        )
      `,
      )
      .eq("workout_id", workoutId),
    workoutSplit
      ? supabase
          .from("exercise_splits")
          .select("exercise_id, sort_order")
          .eq("split_name", workoutSplit)
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("workout_exercise_order")
      .select("exercise_id, sort_order")
      .eq("workout_id", workoutId),
  ]);

  if (error) throw new Error(error.message);

  // Build a map of exercise_id → per-split sort_order for correct workout ordering
  const splitSortOrderMap = new Map<string, number>(
    (splitOrderData.data ?? []).map((r) => [r.exercise_id, r.sort_order]),
  );
  // Per-workout order overrides the split default — set by Skip (#93).
  const workoutSortOrderMap = new Map<string, number>(
    (workoutOrderData.data ?? []).map((r) => [r.exercise_id, r.sort_order]),
  );

  const rows: FlatSetRow[] = (data ?? []).map((row) => {
    const ex = row.exercises as unknown as {
      name: string;
      tracking_type: TrackingType;
      notes: string | null;
      machine_start_weight: number | null;
      machine_end_weight: number | null;
      machine_increment: number | null;
      duration_start_seconds: number | null;
      duration_end_seconds: number | null;
      duration_step_seconds: number | null;
      stretch_kind?: string | null;
      sort_order?: number | null;
      rest_seconds?: number | null;
    } | null;

    const sk = ex?.stretch_kind;
    const stretch_kind =
      sk === "dynamic" || sk === "static" || sk === "none" ? sk : "none";

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
      set_type: row.set_type ?? "working",
      completed_at: row.completed_at,
      started_at: row.started_at,
      exercise_name: ex?.name ?? "Unknown",
      tracking_type: (ex?.tracking_type ?? "weighted") as TrackingType,
      exercise_notes: ex?.notes ?? null,
      machine_start_weight: ex?.machine_start_weight ?? null,
      machine_end_weight: ex?.machine_end_weight ?? null,
      machine_increment: ex?.machine_increment ?? null,
      duration_start_seconds: ex?.duration_start_seconds ?? null,
      duration_end_seconds: ex?.duration_end_seconds ?? null,
      duration_step_seconds: ex?.duration_step_seconds ?? null,
      stretch_kind,
      sort_order:
        workoutSortOrderMap.get(row.exercise_id) ??
        splitSortOrderMap.get(row.exercise_id) ??
        ex?.sort_order ??
        0,
      split_catalog_order:
        splitSortOrderMap.get(row.exercise_id) ?? ex?.sort_order ?? 0,
      rest_seconds:
        ex?.rest_seconds == null ? null : Number(ex.rest_seconds),
    };
  });

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

export async function fetchExerciseWeightPresetsMap(
  exerciseIds: string[],
): Promise<Record<string, number[]>> {
  const ids = [...new Set(exerciseIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weight_options")
    .select("exercise_id, value")
    .in("exercise_id", ids)
    .order("value", { ascending: true });

  if (error) throw new Error(error.message);

  const map = new Map<string, number[]>();
  for (const row of data ?? []) {
    if (!row.exercise_id) continue;
    const nums = map.get(row.exercise_id) ?? [];
    nums.push(Number(row.value));
    map.set(row.exercise_id, nums);
  }

  return Object.fromEntries(
    [...map.entries()].map(([exerciseId, values]) => [
      exerciseId,
      [...new Set(values)].sort((a, b) => a - b),
    ]),
  );
}

export async function fetchTrainingProfile(): Promise<{
  body_weight: number | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_training_profile")
    .select("body_weight")
    .eq("singleton", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    body_weight:
      data?.body_weight == null ? null : Number(data.body_weight),
  };
}

export async function fetchBodyWeight(): Promise<number | null> {
  const p = await fetchTrainingProfile();
  return p.body_weight;
}

/** Latest logged weight per `(exercise_id, set_number)` from completed workouts on or before `beforeDate` (YYYY-MM-DD). */
export async function fetchPreviousWeightsBeforeDate(
  beforeDate: string,
  exerciseIds: string[],
  split?: string,
): Promise<Record<string, number>> {
  const ids = [...new Set(exerciseIds.filter(Boolean))];
  if (!ids.length) return {};

  const supabase = await createClient();

  let workoutsQuery = supabase
    .from("workouts")
    .select("id, date, created_at")
    .eq("status", "completed")
    .is("deleted_at", null)
    .lte("date", beforeDate);
  if (split?.trim()) {
    workoutsQuery = workoutsQuery.eq("split", split.trim());
  }
  const { data: completedWorkouts, error: completedErr } = await workoutsQuery
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);
  if (completedErr) throw new Error(completedErr.message);

  const workoutIds = (completedWorkouts ?? []).map((w) => w.id);
  if (!workoutIds.length) return {};

  const rankByWorkoutId = rankWorkoutsByRecency(workoutIds);

  const { data: previousSetRows, error: previousErr } = await supabase
    .from("workout_sets")
    .select("workout_id, exercise_id, set_number, weight")
    .in("workout_id", workoutIds)
    .in("exercise_id", ids)
    .neq("set_type", "warmup");
  if (previousErr) throw new Error(previousErr.message);

  // A null weight on a completed set only occurs for bodyweight exercises
  // with no extra load logged (weighted/assisted sets can't complete with a
  // null weight — see isSetReadyToComplete). Treat it as 0 rather than
  // skipping the row entirely, so a more recent 0-extra-weight session isn't
  // shadowed by an older session that happened to log real weight (#92).
  const picked = pickMostRecentByKey(
    (previousSetRows ?? []).map((row) => ({
      workout_id: row.workout_id,
      key: `${row.exercise_id}:${row.set_number}`,
      value: row.weight == null ? 0 : Number(row.weight),
    })),
    rankByWorkoutId,
  );

  return Object.fromEntries(picked.entries());
}

export async function fetchPreviousWeightsForWorkout(
  workoutId: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data: workout, error: workoutErr } = await supabase
    .from("workouts")
    .select("id, date, split")
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

  // No split filter — show last weight for each exercise regardless of which split it was done in.
  return fetchPreviousWeightsBeforeDate(workout.date, exerciseIds);
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
    .is("archived_at", null)
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

/** Fetch archived splits (for restore UI). */
export async function fetchArchivedSplits(): Promise<WorkoutSplitRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_splits")
    .select("id, name")
    .not("archived_at", "is", null)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Prefer {@link fetchSplitsCatalog} when you need `splitsTableReady`. */
export async function fetchWorkoutSplits(): Promise<WorkoutSplitRow[]> {
  const { splits } = await fetchSplitsCatalog();
  return splits;
}
