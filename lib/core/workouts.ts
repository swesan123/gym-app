import type { TrackingType } from "@/lib/database.types";
import {
  fetchPreviousWeightsBeforeDate,
  isWorkoutSplitsTableUnavailable,
} from "@/lib/queries/read";
import {
  SMART_PROGRESSION_RIR_TARGET,
  resolveSetProgressionDirection,
} from "@/lib/progressionRir";
import {
  applyFixedIncrement,
  usesLoggedWeightColumn,
} from "@/lib/progressiveOverload";
import { pickLatestWorkoutPerExercise, rankWorkoutsByRecency } from "@/lib/previousPerformance";
import { normalizeLoggedWeight } from "@/lib/normalizeLoggedWeight";
import { createClient } from "@/lib/supabase/server";
import { formatWorkoutWeek } from "@/lib/week";
import { computeSetVolume } from "@/lib/volume";

type CompletedSetPerf = {
  set_number: number;
  reps: number | null;
  rir: number | null;
};

/**
 * Latest completed performance (reps/RIR) per exercise, used to gate
 * progressive overload. Deliberately not filtered by split — an exercise
 * moved to a new split should still progress from wherever it was last
 * performed, matching `fetchPreviousWeightsBeforeDate`'s cross-split lookup
 * (#91: exercises stopped progressing after being moved into a new split).
 */
export async function fetchLatestCompletedSetsByExercise(
  beforeDate: string,
  exerciseIds: string[],
): Promise<Record<string, CompletedSetPerf[]>> {
  const ids = [...new Set(exerciseIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const supabase = await createClient();

  const { data: completedWorkouts, error: wErr } = await supabase
    .from("workouts")
    .select("id, date, created_at")
    .eq("status", "completed")
    .is("deleted_at", null)
    .lte("date", beforeDate)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);
  if (wErr) throw new Error(wErr.message);

  const workoutIds = (completedWorkouts ?? []).map((w) => w.id);
  if (workoutIds.length === 0) return {};

  const rankByWorkout = rankWorkoutsByRecency(workoutIds);

  const { data: setRows, error: sErr } = await supabase
    .from("workout_sets")
    .select("workout_id, exercise_id, set_number, reps, rir")
    .in("workout_id", workoutIds)
    .in("exercise_id", ids);
  if (sErr) throw new Error(sErr.message);

  const latestWorkoutByExercise = pickLatestWorkoutPerExercise(
    (setRows ?? []).map((row) => ({
      workout_id: row.workout_id,
      exercise_id: row.exercise_id,
    })),
    rankByWorkout,
  );

  const out = new Map<string, CompletedSetPerf[]>();
  for (const row of setRows ?? []) {
    const winningWorkoutId = latestWorkoutByExercise.get(row.exercise_id);
    if (!winningWorkoutId || row.workout_id !== winningWorkoutId) continue;
    const list = out.get(row.exercise_id) ?? [];
    list.push({
      set_number: row.set_number,
      reps: row.reps,
      rir: row.rir,
    });
    out.set(row.exercise_id, list);
  }

  return Object.fromEntries(
    [...out.entries()].map(([exerciseId, rows]) => [
      exerciseId,
      rows.sort((a, b) => a.set_number - b.set_number),
    ]),
  );
}

async function fetchDraftSetContext(date: string, exerciseIds: string[]) {
  const supabase = await createClient();
  const [{ data: profile }, previousByKey, latestPerfByExercise] =
    await Promise.all([
      supabase
        .from("user_training_profile")
        .select("body_weight")
        .eq("singleton", true)
        .maybeSingle(),
      fetchPreviousWeightsBeforeDate(date, exerciseIds),
      fetchLatestCompletedSetsByExercise(date, exerciseIds),
    ]);

  return {
    bodyWeight:
      profile?.body_weight == null ? null : Number(profile.body_weight),
    previousByKey,
    latestPerfByExercise,
  };
}

type ExerciseDraftSource = {
  id: string;
  default_sets: number;
  default_reps: number | null;
  progressive_overload_increment: number | null;
  tracking_type: string | null;
  machine_start_weight: number | null;
  machine_end_weight: number | null;
  machine_increment: number | null;
};

function buildDraftSetInsertRows(
  workoutId: string,
  exercise: ExerciseDraftSource,
  bodyWeight: number | null,
  previousByKey: Record<string, number | null>,
  latestPerfByExercise: Record<string, CompletedSetPerf[]>,
) {
  const tt = (exercise.tracking_type ?? "weighted") as TrackingType;
  const incrementConfigured =
    exercise.progressive_overload_increment == null
      ? null
      : Number(exercise.progressive_overload_increment);
  const defaultReps =
    exercise.default_reps != null ? Number(exercise.default_reps) : null;
  const latestSets = latestPerfByExercise[exercise.id] ?? [];
  const latestSetByNumber = new Map(
    latestSets.map((s) => [s.set_number, s]),
  );

  return Array.from({ length: exercise.default_sets }, (_, i) => {
    const set_number = i + 1;
    const key = `${exercise.id}:${set_number}`;
    const lastW = previousByKey[key] ?? null;
    // For timed exercises, default_reps holds the default duration (seconds) instead (#90).
    const reps = tt === "timed" ? null : defaultReps;
    const durationSeconds = tt === "timed" ? defaultReps : null;

    const progressionDirection = resolveSetProgressionDirection(
      latestSetByNumber.get(set_number) ?? null,
      defaultReps,
      SMART_PROGRESSION_RIR_TARGET,
    );

    let weight: number | null = null;
    if (usesLoggedWeightColumn(tt)) {
      if (incrementConfigured != null) {
        weight = applyFixedIncrement(
          lastW,
          incrementConfigured,
          progressionDirection,
          exercise.machine_start_weight,
          exercise.machine_end_weight,
          exercise.machine_increment,
          tt,
        );
      } else {
        weight = lastW;
      }
      weight = normalizeLoggedWeight(tt, weight);
    }

    const volume = computeSetVolume(tt, {
      reps,
      weight,
      bodyWeight,
    });

    return {
      workout_id: workoutId,
      exercise_id: exercise.id,
      set_number,
      reps,
      weight,
      duration_seconds: durationSeconds,
      volume,
    };
  });
}

export async function createWorkoutDraft(split: string): Promise<{ id: string }> {
  const splitName = split.trim();
  if (!splitName) throw new Error("Choose a split");

  const supabase = await createClient();

  const { data: known, error: splitErr } = await supabase
    .from("workout_splits")
    .select("id")
    .eq("name", splitName)
    .maybeSingle();

  if (splitErr && !isWorkoutSplitsTableUnavailable(splitErr)) {
    throw new Error(splitErr.message);
  }

  const splitsTableMissing =
    !!splitErr && isWorkoutSplitsTableUnavailable(splitErr);

  if (!splitsTableMissing && !known) {
    throw new Error("Unknown split. Add it under Settings → Splits.");
  }

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const week = formatWorkoutWeek(today);

  // Parallelize the workout insert with the exercise lookup — these are
  // independent writes/reads, so there's no need to wait on one before
  // starting the other (#71).
  const [{ data: workout, error: wErr }, { data: exercises, error: eErr }] =
    await Promise.all([
      supabase
        .from("workouts")
        .insert({ date: dateStr, week, split: splitName, status: "draft" })
        .select("id")
        .single(),
      supabase
        .from("exercises")
        .select(
          "id, default_sets, default_reps, progressive_overload_increment, tracking_type, machine_start_weight, machine_end_weight, machine_increment, name, exercise_splits!inner(sort_order)",
        )
        .eq("exercise_splits.split_name", splitName)
        .order("name", { ascending: true }),
    ]);

  if (wErr || !workout) {
    throw new Error(wErr?.message ?? "Failed to create workout");
  }

  if (!eErr && exercises) {
    exercises.sort((a, b) => {
      const aSort = (a.exercise_splits as { sort_order: number }[])?.[0]?.sort_order ?? Infinity;
      const bSort = (b.exercise_splits as { sort_order: number }[])?.[0]?.sort_order ?? Infinity;
      return aSort - bSort || a.name.localeCompare(b.name);
    });
  }

  if (eErr || !exercises?.length) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    throw new Error(eErr?.message ?? "No exercises for this split");
  }

  const exerciseIds = exercises.map((e) => e.id);

  const { bodyWeight, previousByKey, latestPerfByExercise } =
    await fetchDraftSetContext(dateStr, exerciseIds);

  const rows = exercises.flatMap((ex) =>
    buildDraftSetInsertRows(
      workout.id,
      ex,
      bodyWeight,
      previousByKey,
      latestPerfByExercise,
    ),
  );

  // Seed per-workout exercise order from the split's current order so Skip
  // (#93) has a stable starting point to reshuffle from this session only.
  const orderRows = exercises.map((ex) => ({
    workout_id: workout.id,
    exercise_id: ex.id,
    sort_order:
      (ex.exercise_splits as { sort_order: number }[])?.[0]?.sort_order ?? 0,
  }));

  const [{ error: sErr }, { error: orderErr }] = await Promise.all([
    supabase.from("workout_sets").insert(rows),
    supabase.from("workout_exercise_order").insert(orderRows),
  ]);
  if (sErr || orderErr) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    throw new Error(sErr?.message ?? orderErr?.message);
  }

  return { id: workout.id };
}

/**
 * When an exercise is added to a split that has an active draft workout,
 * append its default sets so the in-progress session stays in sync (#79).
 * Returns the synced draft id (or null when nothing changed) so callers can revalidate.
 */
export async function syncExerciseToActiveDraftCore(
  exerciseId: string,
  splitName: string,
): Promise<string | null> {
  const trimmed = splitName.trim();
  if (!trimmed) return null;

  const supabase = await createClient();

  const { data: draft, error: dErr } = await supabase
    .from("workouts")
    .select("id, date, split")
    .eq("split", trimmed)
    .eq("status", "draft")
    .maybeSingle();
  if (dErr) throw new Error(dErr.message);
  if (!draft) return null;

  const { count, error: countErr } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", draft.id)
    .eq("exercise_id", exerciseId);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) return null;

  const { data: exercise, error: exErr } = await supabase
    .from("exercises")
    .select(
      "id, default_sets, default_reps, progressive_overload_increment, tracking_type, machine_start_weight, machine_end_weight, machine_increment",
    )
    .eq("id", exerciseId)
    .single();
  if (exErr || !exercise) {
    throw new Error(exErr?.message ?? "Exercise not found");
  }

  const { bodyWeight, previousByKey, latestPerfByExercise } =
    await fetchDraftSetContext(draft.date, [exerciseId]);

  const insertRows = buildDraftSetInsertRows(
    draft.id,
    exercise,
    bodyWeight,
    previousByKey,
    latestPerfByExercise,
  );

  if (insertRows.length === 0) return null;

  const { error: insertErr } = await supabase
    .from("workout_sets")
    .insert(insertRows);
  if (insertErr) throw new Error(insertErr.message);

  return draft.id;
}
