"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FlatSetRow } from "@/components/workout/groupSets";
import type { SetType, StretchKind, TrackingType } from "@/lib/database.types";
import {
  fetchPreviousWeightsBeforeDate,
  fetchSetsForWorkout,
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
import { isSetReadyToComplete } from "@/lib/setCompletion";
import { computeSkipOrderUpdates } from "@/lib/skipExerciseOrder";
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
async function fetchLatestCompletedSetsByExercise(
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

export async function createWorkoutDraftAndRedirect(split: string) {
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
      "exercise_id, reps, weight, rir, duration_seconds, note, set_type, completed_at, started_at",
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

  // Any save on a not-yet-started set counts as the user beginning work on
  // it — covers the common case of hitting Done on prefilled values with no
  // preceding rest timer, where no individual field actually changes (#95).
  const startedAt = row.started_at ?? new Date().toISOString();

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
      started_at: startedAt,
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
  const trimmed = splitName.trim();
  if (!trimmed) return;

  const supabase = await createClient();

  const { data: draft, error: dErr } = await supabase
    .from("workouts")
    .select("id, date, split")
    .eq("split", trimmed)
    .eq("status", "draft")
    .maybeSingle();
  if (dErr) throw new Error(dErr.message);
  if (!draft) return;

  const { count, error: countErr } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", draft.id)
    .eq("exercise_id", exerciseId);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) return;

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

  if (insertRows.length === 0) return;

  const { error: insertErr } = await supabase
    .from("workout_sets")
    .insert(insertRows);
  if (insertErr) throw new Error(insertErr.message);

  revalidatePath(`/workout/${draft.id}`);
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
