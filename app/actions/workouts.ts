"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FlatSetRow } from "@/components/workout/groupSets";
import type { SetType, StretchKind, TrackingType } from "@/lib/database.types";
import {
  createWorkoutDraft,
  fetchLatestCompletedSetsByExercise,
  syncExerciseToActiveDraftCore,
} from "@/lib/core/workouts";
import {
  fetchPreviousWeightsBeforeDate,
  fetchSetsForWorkout,
} from "@/lib/queries/read";
import {
  SMART_PROGRESSION_RIR_TARGET,
  resolveSetProgressionDirection,
} from "@/lib/progressionRir";
import {
  applyFixedIncrement,
  usesLoggedWeightColumn,
} from "@/lib/progressiveOverload";
import { isSetReadyToComplete } from "@/lib/setCompletion";
import { computeSkipOrderUpdates } from "@/lib/skipExerciseOrder";
import { normalizeLoggedWeight } from "@/lib/normalizeLoggedWeight";
import { createClient } from "@/lib/supabase/server";
import { computeSetVolume } from "@/lib/volume";

export async function createWorkoutDraftAndRedirect(split: string) {
  const { id } = await createWorkoutDraft(split);

  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/workout/${id}`);
}

export async function updateWorkoutSet(input: {
  id: string;
  reps?: number | null;
  weight?: number | null;
  rir?: number | null;
  duration_seconds?: number | null;
  note?: string | null;
  set_type?: SetType;
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
    .select(
      "exercise_id, reps, weight, rir, duration_seconds, note, set_type, completed_at",
    )
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
  const rir = input.rir !== undefined ? input.rir : row.rir;
  const durationSeconds =
    input.duration_seconds !== undefined
      ? input.duration_seconds
      : row.duration_seconds;
  const setType = input.set_type !== undefined ? input.set_type : row.set_type;

  // Editing a tracked field after the set was marked Done invalidates the
  // completion — the user must re-confirm with Done (#73).
  const trackedFieldChanged =
    (input.reps !== undefined && input.reps !== row.reps) ||
    (input.weight !== undefined && input.weight !== row.weight) ||
    (input.rir !== undefined && input.rir !== row.rir) ||
    (input.duration_seconds !== undefined &&
      input.duration_seconds !== row.duration_seconds);
  const completedAt =
    trackedFieldChanged && row.completed_at != null ? null : row.completed_at;

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
      rir,
      duration_seconds: durationSeconds,
      note: input.note !== undefined ? input.note : row.note,
      set_type: setType,
      volume,
      completed_at: completedAt,
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
}

/**
 * Stamp the moment a set becomes "next up" — called when the rest timer
 * for the previous set ends or is skipped, so the elapsed time shown in
 * history reflects when the set became available rather than whenever the
 * user gets around to editing a field (#95). A no-op if already started.
 */
export async function markSetStarted(setId: string): Promise<{ startedAt: string }> {
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("workout_sets")
    .select("started_at")
    .eq("id", setId)
    .single();
  if (fetchErr || !row) throw new Error(fetchErr?.message ?? "Set not found");

  if (row.started_at != null) {
    return { startedAt: row.started_at };
  }

  const startedAt = new Date().toISOString();
  const { error } = await supabase
    .from("workout_sets")
    .update({ started_at: startedAt })
    .eq("id", setId);
  if (error) throw new Error(error.message);

  return { startedAt };
}

/** Mark a single set as explicitly Done after validating it's fully filled in (#73). */
export async function markSetDone(setId: string) {
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("workout_sets")
    .select("exercise_id, reps, weight, rir, duration_seconds")
    .eq("id", setId)
    .single();

  if (fetchErr || !row) {
    throw new Error(fetchErr?.message ?? "Set not found");
  }

  const { data: exercise } = await supabase
    .from("exercises")
    .select("tracking_type, stretch_kind")
    .eq("id", row.exercise_id)
    .single();

  const trackingType = (exercise?.tracking_type ?? "weighted") as TrackingType;
  const stretchKind = exercise?.stretch_kind ?? null;

  if (
    !isSetReadyToComplete({
      tracking_type: trackingType,
      stretch_kind: stretchKind,
      reps: row.reps,
      weight: row.weight,
      rir: row.rir,
      duration_seconds: row.duration_seconds,
    })
  ) {
    throw new Error(
      "Fill in reps/time and weight (if applicable) before marking this set done.",
    );
  }

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("workout_sets")
    .update({ completed_at: completedAt })
    .eq("id", setId);

  if (error) throw new Error(error.message);

  // Deliberately not revalidating `/workout/${workoutId}` here — the active
  // workout page already reflects completion optimistically via localRows,
  // and a full RSC re-render on every Done tap has caused intermittent
  // Server Components render errors.
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");

  return { completedAt };
}

/** Clear the Done state for a set so the user can re-edit it. */
export async function clearSetDone(setId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_sets")
    .update({ completed_at: null })
    .eq("id", setId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

/** Mark every working set of an exercise as Done in one shot, failing if any set is incomplete. */
export async function markExerciseDone(workoutId: string, exerciseId: string) {
  const supabase = await createClient();

  const { data: rows, error: fetchErr } = await supabase
    .from("workout_sets")
    .select("id, reps, weight, rir, duration_seconds, set_type")
    .eq("workout_id", workoutId)
    .eq("exercise_id", exerciseId);

  if (fetchErr) throw new Error(fetchErr.message);

  const { data: exercise } = await supabase
    .from("exercises")
    .select("tracking_type, stretch_kind")
    .eq("id", exerciseId)
    .single();

  const trackingType = (exercise?.tracking_type ?? "weighted") as TrackingType;
  const stretchKind = exercise?.stretch_kind ?? null;

  const workingRows = (rows ?? []).filter((r) => r.set_type !== "warmup");
  const notReady = workingRows.filter(
    (r) =>
      !isSetReadyToComplete({
        tracking_type: trackingType,
        stretch_kind: stretchKind,
        reps: r.reps,
        weight: r.weight,
        rir: r.rir,
        duration_seconds: r.duration_seconds,
      }),
  );

  if (notReady.length > 0) {
    throw new Error(
      "Fill in reps/time and weight (if applicable) for every set before marking this exercise done.",
    );
  }

  const ids = workingRows.map((r) => r.id);
  if (ids.length === 0) return;

  const { error } = await supabase
    .from("workout_sets")
    .update({ completed_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath(`/workout/${workoutId}`);
  revalidatePath("/");
}

export async function addWorkoutSet(
  workoutId: string,
  exerciseId: string,
): Promise<FlatSetRow> {
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
      "name, tracking_type, stretch_kind, sort_order, notes, default_sets, default_reps, progressive_overload_increment, machine_start_weight, machine_end_weight, machine_increment, duration_start_seconds, duration_end_seconds, duration_step_seconds, rest_seconds",
    )
    .eq("id", exerciseId)
    .single();

  if (exErr || !exercise) throw new Error(exErr?.message ?? "Exercise not found");

  const { data: splitOrderRow } = await supabase
    .from("exercise_splits")
    .select("sort_order")
    .eq("exercise_id", exerciseId)
    .eq("split_name", workout.split)
    .maybeSingle();

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

  // No split filter — use last weight from any split for pre-filling.
  const previousByKey = await fetchPreviousWeightsBeforeDate(workout.date, [exerciseId]);
  const lastW = previousByKey[`${exerciseId}:${next}`] ?? null;
  const defaultReps =
    exercise.default_reps != null ? Number(exercise.default_reps) : null;
  // For timed exercises, default_reps holds the default duration (seconds) instead (#90).
  const reps = trackingType === "timed" ? null : defaultReps;
  const durationSeconds = trackingType === "timed" ? defaultReps : null;

  // No split filter here either (#91) — progression should follow the
  // exercise's most recent completed performance regardless of split.
  const latestPerfByExercise = await fetchLatestCompletedSetsByExercise(
    workout.date,
    [exerciseId],
  );
  const latestSets = latestPerfByExercise[exerciseId] ?? [];
  const latestSet = latestSets.find((s) => s.set_number === next) ?? null;

  // Resolve progression direction for this specific set number (#69, #70).
  const progressionDirection = resolveSetProgressionDirection(
    latestSet,
    defaultReps,
    SMART_PROGRESSION_RIR_TARGET,
  );

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
    weight = normalizeLoggedWeight(trackingType, weight);
  }

  const volume = computeSetVolume(trackingType, {
    reps,
    weight,
    bodyWeight,
  });

  const { data: inserted, error } = await supabase
    .from("workout_sets")
    .insert({
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_number: next,
      reps,
      weight,
      duration_seconds: durationSeconds,
      volume,
    })
    .select("id, set_number, reps, weight, rir, duration_seconds, volume, note, set_type, completed_at, started_at")
    .single();

  if (error || !inserted) throw new Error(error?.message ?? "Failed to add set");

  const sk = exercise.stretch_kind;
  const stretchKind: FlatSetRow["stretch_kind"] =
    sk === "dynamic" || sk === "static" ? sk : "none";

  // Deliberately not revalidating `/workout/${workoutId}` — the active
  // workout page reflects the new set optimistically via localRows.
  revalidatePath("/");

  return {
    ...inserted,
    exercise_id: exerciseId,
    exercise_name: exercise.name,
    tracking_type: trackingType,
    stretch_kind: stretchKind,
    sort_order: exercise.sort_order ?? 0,
    split_catalog_order:
      splitOrderRow?.sort_order ?? exercise.sort_order ?? 0,
    exercise_notes: exercise.notes ?? null,
    machine_start_weight: exercise.machine_start_weight ?? null,
    machine_end_weight: exercise.machine_end_weight ?? null,
    machine_increment: exercise.machine_increment ?? null,
    duration_start_seconds: exercise.duration_start_seconds ?? null,
    duration_end_seconds: exercise.duration_end_seconds ?? null,
    duration_step_seconds: exercise.duration_step_seconds ?? null,
    rest_seconds: exercise.rest_seconds == null ? null : Number(exercise.rest_seconds),
  };
}

export async function removeWorkoutSet(setId: string, workoutId: string) {
  const supabase = await createClient();

  const { data: target, error: fetchErr } = await supabase
    .from("workout_sets")
    .select("exercise_id")
    .eq("id", setId)
    .eq("workout_id", workoutId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!target) throw new Error("Set not found");

  const { count, error: countErr } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", workoutId)
    .eq("exercise_id", target.exercise_id);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) <= 1) {
    throw new Error(
      "Cannot remove the last set for this exercise. Add another set first, or remove the exercise from Settings.",
    );
  }

  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  if (error) throw new Error(error.message);

  revalidatePath(`/workout/${workoutId}`);
  revalidatePath("/");
}

/**
 * Swap an exercise one position forward within its stretch section
 * (dynamic/main/static) for this workout session only, so it can be
 * revisited later without losing the split's default order (#93).
 *
 * Reorder defers to after the next exercise in split catalog order (not a
 * symmetric swap with the visual neighbor).
 */
export async function skipExerciseInWorkout(
  workoutId: string,
  exerciseId: string,
): Promise<{ exerciseId: string; sortOrder: number }[]> {
  const supabase = await createClient();

  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .select("split")
    .eq("id", workoutId)
    .single();
  if (wErr || !workout) throw new Error(wErr?.message ?? "Workout not found");

  const { data: setRows, error: sErr } = await supabase
    .from("workout_sets")
    .select("exercise_id")
    .eq("workout_id", workoutId);
  if (sErr) throw new Error(sErr.message);

  const exerciseIds = [
    ...new Set((setRows ?? []).map((r) => r.exercise_id)),
  ];
  if (exerciseIds.length === 0) return [];

  const [
    { data: exercises, error: exErr },
    { data: workoutOrderRows, error: woErr },
    { data: splitOrderRows, error: soErr },
  ] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, stretch_kind, sort_order")
      .in("id", exerciseIds),
    supabase
      .from("workout_exercise_order")
      .select("exercise_id, sort_order")
      .eq("workout_id", workoutId),
    supabase
      .from("exercise_splits")
      .select("exercise_id, sort_order")
      .eq("split_name", workout.split),
  ]);
  if (exErr) throw new Error(exErr.message);
  if (woErr) throw new Error(woErr.message);
  if (soErr) throw new Error(soErr.message);

  const splitSortByExercise = new Map(
    (splitOrderRows ?? []).map((r) => [r.exercise_id, r.sort_order]),
  );
  const workoutSortByExercise = new Map(
    (workoutOrderRows ?? []).map((r) => [r.exercise_id, r.sort_order]),
  );
  const currentSortOrder = (id: string, globalSortOrder: number | null) =>
    workoutSortByExercise.get(id) ??
    splitSortByExercise.get(id) ??
    globalSortOrder ??
    0;

  const orderInfo = (exercises ?? []).map((e) => ({
    id: e.id,
    stretchKind: (e.stretch_kind ?? "none") as StretchKind,
    sortOrder: currentSortOrder(e.id, e.sort_order),
    splitOrder: splitSortByExercise.get(e.id) ?? e.sort_order ?? 0,
  }));

  const updates = computeSkipOrderUpdates(orderInfo, exerciseId);
  if (updates.length === 0) return [];

  const { error: upsertErr } = await supabase
    .from("workout_exercise_order")
    .upsert(
      updates.map((u) => ({
        workout_id: workoutId,
        exercise_id: u.exerciseId,
        sort_order: u.sortOrder,
      })),
      { onConflict: "workout_id,exercise_id" },
    );
  if (upsertErr) throw new Error(upsertErr.message);

  revalidatePath(`/workout/${workoutId}`);
  revalidatePath("/");

  return updates;
}


/**
 * When an exercise is added to a split that has an active draft workout,
 * append its default sets so the in-progress session stays in sync (#79).
 */
export async function syncExerciseToActiveDraft(
  exerciseId: string,
  splitName: string,
): Promise<void> {
  const draftId = await syncExerciseToActiveDraftCore(exerciseId, splitName);
  if (!draftId) return;

  revalidatePath(`/workout/${draftId}`);
  revalidatePath("/");
}

/** Fetch current set rows for an active workout without a full page refresh. */
export async function fetchWorkoutSetRows(
  workoutId: string,
): Promise<FlatSetRow[]> {
  const supabase = await createClient();
  const { data: workout, error } = await supabase
    .from("workouts")
    .select("split")
    .eq("id", workoutId)
    .maybeSingle();
  if (error || !workout) {
    throw new Error(error?.message ?? "Workout not found");
  }
  return fetchSetsForWorkout(workoutId, workout.split);
}

export async function finishWorkout(workoutId: string) {
  const supabase = await createClient();

  const { data: setRows, error: setsErr } = await supabase
    .from("workout_sets")
    .select("id, set_type, completed_at")
    .eq("workout_id", workoutId);
  if (setsErr) throw new Error(setsErr.message);

  const undoneWorkingSets = (setRows ?? []).filter(
    (s) => s.set_type !== "warmup" && s.completed_at == null,
  );
  if (undoneWorkingSets.length > 0) {
    throw new Error(
      `${undoneWorkingSets.length} set${undoneWorkingSets.length === 1 ? "" : "s"} not marked Done yet. Finish logging every set before completing the workout.`,
    );
  }

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

/** Soft-delete so a workout is recoverable rather than lost with no trace. */
export async function deleteWorkout(workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", workoutId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
}

export async function restoreWorkout(workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ deleted_at: null })
    .eq("id", workoutId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
}

/** Irreversibly remove a soft-deleted workout — only reachable from the "Recently deleted" list. */
export async function permanentlyDeleteWorkout(workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .not("deleted_at", "is", null);
  if (error) throw new Error(error.message);

  revalidatePath("/history");
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
