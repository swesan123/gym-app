"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { TrackingType } from "@/lib/database.types";
import {
  fetchPreviousWeightsBeforeDate,
  isWorkoutSplitsTableUnavailable,
} from "@/lib/queries/read";
import {
  SMART_PROGRESSION_RIR_TARGET,
  resolveProgressionDirection,
  type ProgressionDirection,
} from "@/lib/progressionRir";
import {
  applyFixedIncrement,
  usesLoggedWeightColumn,
} from "@/lib/progressiveOverload";
import { createClient } from "@/lib/supabase/server";
import { UNASSIGNED_SPLIT_NAME } from "@/lib/constants";
import { formatWorkoutWeek } from "@/lib/week";
import { computeSetVolume } from "@/lib/volume";

type CompletedSetPerf = {
  set_number: number;
  reps: number | null;
  rir: number | null;
};

async function fetchLatestCompletedSetsByExercise(
  beforeDate: string,
  exerciseIds: string[],
  split: string,
): Promise<Record<string, CompletedSetPerf[]>> {
  const ids = [...new Set(exerciseIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const supabase = await createClient();

  const { data: completedWorkouts, error: wErr } = await supabase
    .from("workouts")
    .select("id, date, created_at")
    .eq("status", "completed")
    .eq("split", split)
    .lte("date", beforeDate)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);
  if (wErr) throw new Error(wErr.message);

  const workoutIds = (completedWorkouts ?? []).map((w) => w.id);
  if (workoutIds.length === 0) return {};

  const rankByWorkout = new Map<string, number>();
  workoutIds.forEach((id, idx) => rankByWorkout.set(id, idx));

  const { data: setRows, error: sErr } = await supabase
    .from("workout_sets")
    .select("workout_id, exercise_id, set_number, reps, rir")
    .in("workout_id", workoutIds)
    .in("exercise_id", ids);
  if (sErr) throw new Error(sErr.message);

  const bestWorkoutByExercise = new Map<string, { rank: number; workoutId: string }>();
  for (const row of setRows ?? []) {
    const rank =
      rankByWorkout.get(row.workout_id) ?? Number.MAX_SAFE_INTEGER;
    const existing = bestWorkoutByExercise.get(row.exercise_id);
    if (!existing || rank < existing.rank) {
      bestWorkoutByExercise.set(row.exercise_id, {
        rank,
        workoutId: row.workout_id,
      });
    }
  }

  const out = new Map<string, CompletedSetPerf[]>();
  for (const row of setRows ?? []) {
    const best = bestWorkoutByExercise.get(row.exercise_id);
    if (!best || row.workout_id !== best.workoutId) continue;
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

export async function createWorkoutDraftAndRedirect(split: string) {
  const splitName = split.trim();
  if (!splitName) throw new Error("Choose a split");
  if (splitName === UNASSIGNED_SPLIT_NAME) {
    throw new Error(
      "Unassigned is only for parking exercises in settings, not for starting a workout.",
    );
  }

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

  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .insert({ date: dateStr, week, split: splitName, status: "draft" })
    .select("id")
    .single();

  if (wErr || !workout) {
    throw new Error(wErr?.message ?? "Failed to create workout");
  }

  const { data: exercises, error: eErr } = await supabase
    .from("exercises")
    .select(
      "id, default_sets, default_reps, progressive_overload_increment, tracking_type, machine_start_weight, machine_end_weight, machine_increment, exercise_splits!inner(sort_order)",
    )
    .eq("exercise_splits.split_name", splitName)
    .order("exercise_splits.sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (eErr || !exercises?.length) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    throw new Error(eErr?.message ?? "No exercises for this split");
  }

  const { data: profile } = await supabase
    .from("user_training_profile")
    .select("body_weight")
    .eq("singleton", true)
    .maybeSingle();
  const bodyWeight =
    profile?.body_weight == null ? null : Number(profile.body_weight);

  const exerciseIds = exercises.map((e) => e.id);
  const previousByKey = await fetchPreviousWeightsBeforeDate(
    dateStr,
    exerciseIds,
    splitName,
  );
  const latestPerfByExercise = await fetchLatestCompletedSetsByExercise(
    dateStr,
    exerciseIds,
    splitName,
  );

  const rows = exercises.flatMap((ex) => {
    const tt = (ex.tracking_type ?? "weighted") as TrackingType;
    const incrementConfigured =
      ex.progressive_overload_increment == null
        ? null
        : Number(ex.progressive_overload_increment);
    const defaultReps = ex.default_reps != null ? Number(ex.default_reps) : null;
    const latestSets = latestPerfByExercise[ex.id] ?? [];

    // Resolve progression direction at exercise level (not per-set)
    const progressionDirection = resolveProgressionDirection({
      latestSets,
      defaultSets: ex.default_sets,
      defaultReps,
      rirTarget: SMART_PROGRESSION_RIR_TARGET,
    });

    return Array.from({ length: ex.default_sets }, (_, i) => {
      const set_number = i + 1;
      const key = `${ex.id}:${set_number}`;
      const lastW = previousByKey[key] ?? null;
      const reps = defaultReps;

      let weight: number | null = null;
      if (usesLoggedWeightColumn(tt)) {
        if (incrementConfigured != null) {
          // Use fixed increment for this exercise
          weight = applyFixedIncrement(
            lastW,
            incrementConfigured,
            progressionDirection,
            ex.machine_start_weight,
            ex.machine_end_weight,
            ex.machine_increment,
            tt,
          );
        } else {
          // No progression configured
          weight = lastW;
        }
      }

      const volume = computeSetVolume(tt, {
        reps,
        weight,
        bodyWeight,
      });

      return {
        workout_id: workout.id,
        exercise_id: ex.id,
        set_number,
        reps,
        weight,
        volume,
      };
    });
  });

  const { error: sErr } = await supabase.from("workout_sets").insert(rows);
  if (sErr) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    throw new Error(sErr.message);
  }

  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/workout/${workout.id}`);
}

export async function updateWorkoutSet(input: {
  id: string;
  reps?: number | null;
  weight?: number | null;
  rir?: number | null;
  duration_seconds?: number | null;
  note?: string | null;
}) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("user_training_profile")
    .select("body_weight")
    .eq("singleton", true)
    .maybeSingle();
  const bodyWeight =
    profile?.body_weight == null ? null : Number(profile.body_weight);

  const { data: row, error: fetchErr } = await supabase
    .from("workout_sets")
    .select("exercise_id, reps, weight, rir, duration_seconds, note")
    .eq("id", input.id)
    .single();

  if (fetchErr || !row) {
    throw new Error(fetchErr?.message ?? "Set not found");
  }

  const { data: exercise } = await supabase
    .from("exercises")
    .select("tracking_type")
    .eq("id", row.exercise_id)
    .single();

  const trackingType = (exercise?.tracking_type ?? "weighted") as TrackingType;

  const reps = input.reps !== undefined ? input.reps : row.reps;
  const weight = input.weight !== undefined ? input.weight : row.weight;
  const durationSeconds =
    input.duration_seconds !== undefined
      ? input.duration_seconds
      : row.duration_seconds;

  const volume = computeSetVolume(trackingType, {
    reps,
    weight,
    durationSeconds,
    bodyWeight,
  });

  const { error } = await supabase
    .from("workout_sets")
    .update({
      reps,
      weight,
      rir: input.rir !== undefined ? input.rir : row.rir,
      duration_seconds: durationSeconds,
      note: input.note !== undefined ? input.note : row.note,
      volume,
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
}

export async function addWorkoutSet(workoutId: string, exerciseId: string) {
  const supabase = await createClient();

  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .select("date, split")
    .eq("id", workoutId)
    .single();
  if (wErr || !workout) throw new Error(wErr?.message ?? "Workout not found");

  const { data: existing, error: qErr } = await supabase
    .from("workout_sets")
    .select("set_number")
    .eq("workout_id", workoutId)
    .eq("exercise_id", exerciseId)
    .order("set_number", { ascending: false })
    .limit(1);

  if (qErr) throw new Error(qErr.message);

  const next =
    existing && existing.length > 0 ? existing[0].set_number + 1 : 1;

  const { data: exercise, error: exErr } = await supabase
    .from("exercises")
    .select(
      "tracking_type, default_sets, default_reps, progressive_overload_increment, machine_start_weight, machine_end_weight, machine_increment",
    )
    .eq("id", exerciseId)
    .single();

  if (exErr || !exercise) throw new Error(exErr?.message ?? "Exercise not found");

  const trackingType = (exercise.tracking_type ?? "weighted") as TrackingType;
  const incrementConfigured =
    exercise.progressive_overload_increment == null
      ? null
      : Number(exercise.progressive_overload_increment);

  const { data: profile } = await supabase
    .from("user_training_profile")
    .select("body_weight")
    .eq("singleton", true)
    .maybeSingle();
  const bodyWeight =
    profile?.body_weight == null ? null : Number(profile.body_weight);

  const previousByKey = await fetchPreviousWeightsBeforeDate(workout.date, [
    exerciseId,
  ], workout.split);
  const lastW = previousByKey[`${exerciseId}:${next}`] ?? null;
  const reps =
    exercise.default_reps != null ? Number(exercise.default_reps) : null;

  const latestPerfByExercise = await fetchLatestCompletedSetsByExercise(
    workout.date,
    [exerciseId],
    workout.split,
  );
  const latestSets = latestPerfByExercise[exerciseId] ?? [];

  // Resolve progression direction at exercise level
  const progressionDirection = resolveProgressionDirection({
    latestSets,
    defaultSets: exercise.default_sets ?? 3,
    defaultReps: reps,
    rirTarget: SMART_PROGRESSION_RIR_TARGET,
  });

  let weight: number | null = null;
  if (usesLoggedWeightColumn(trackingType)) {
    if (incrementConfigured != null) {
      // Use fixed increment for this exercise
      weight = applyFixedIncrement(
        lastW,
        incrementConfigured,
        progressionDirection,
        exercise.machine_start_weight,
        exercise.machine_end_weight,
        exercise.machine_increment,
        trackingType,
      );
    } else {
      // No progression configured
      weight = lastW;
    }
  }

  const volume = computeSetVolume(trackingType, {
    reps,
    weight,
    bodyWeight,
  });

  const { error } = await supabase.from("workout_sets").insert({
    workout_id: workoutId,
    exercise_id: exerciseId,
    set_number: next,
    reps,
    weight,
    volume,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/workout/${workoutId}`);
  revalidatePath("/");
}

export async function removeWorkoutSet(setId: string, workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  if (error) throw new Error(error.message);

  revalidatePath(`/workout/${workoutId}`);
  revalidatePath("/");
}

export async function finishWorkout(workoutId: string) {
  const supabase = await createClient();
  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("workouts")
    .update({ status: "completed", completed_at: completedAt })
    .eq("id", workoutId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
  redirect("/");
}

export async function deleteWorkout(workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
}

export async function discardDraft(workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("status", "draft");

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
}
