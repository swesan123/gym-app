import type { GetReturnPlanOutput, ReturnPlanExercise } from "@/lib/ai/contracts";
import type { StretchKind, TrackingType } from "@/lib/database.types";
import {
  MAX_LOAD_ADJUSTMENT_PCT,
  NORMAL_TARGET_RIR,
  summarizeLoadAdjustments,
  type LoadAdjustment,
  type LoadAdjustments,
} from "@/lib/loadAdjustment";
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
import {
  applyCutToWeight,
  daysBetween,
  machineGridFrom,
  overloadStepFor,
  planReturnAdjustment,
} from "@/lib/returnFromBreak";
import { createClient } from "@/lib/supabase/server";
import { formatWorkoutWeek } from "@/lib/week";
import { computeSetVolume } from "@/lib/volume";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type CompletedSetPerf = {
  set_number: number;
  reps: number | null;
  rir: number | null;
};

type ExerciseHistory = {
  /** Sets of the latest completed performance (reps/RIR), used to gate progressive overload. */
  sets: CompletedSetPerf[];
  /** `date` of the workout that performance came from. */
  lastPerformedDate: string;
  /** RIR of that workout's completed, non-warmup sets for the exercise. */
  workingRirs: (number | null)[];
  /** Load adjustment that workout was done under, if any. */
  previousAdjustment: LoadAdjustment | null;
};

/**
 * Latest completed performance per exercise (sets, date, working RIRs, stored
 * adjustment). Deliberately not filtered by split — an exercise moved to a new
 * split should still progress from wherever it was last performed, matching
 * `fetchPreviousWeightsBeforeDate`'s cross-split lookup (#91: exercises stopped
 * progressing after being moved into a new split).
 */
async function fetchLatestExerciseHistory(
  beforeDate: string,
  exerciseIds: string[],
): Promise<Record<string, ExerciseHistory>> {
  const ids = [...new Set(exerciseIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const supabase = await createClient();

  const { data: completedWorkouts, error: wErr } = await supabase
    .from("workouts")
    .select("id, date, created_at, load_adjustments")
    .eq("status", "completed")
    .is("deleted_at", null)
    .lte("date", beforeDate)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);
  if (wErr) throw new Error(wErr.message);

  const workoutIds = (completedWorkouts ?? []).map((w) => w.id);
  if (workoutIds.length === 0) return {};

  const workoutById = new Map((completedWorkouts ?? []).map((w) => [w.id, w]));
  const rankByWorkout = rankWorkoutsByRecency(workoutIds);

  const { data: setRows, error: sErr } = await supabase
    .from("workout_sets")
    .select("workout_id, exercise_id, set_number, reps, rir, set_type, completed_at")
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

  const out = new Map<string, ExerciseHistory>();
  for (const row of setRows ?? []) {
    const winningWorkoutId = latestWorkoutByExercise.get(row.exercise_id);
    if (!winningWorkoutId || row.workout_id !== winningWorkoutId) continue;
    const workout = workoutById.get(winningWorkoutId);
    if (!workout) continue;

    const entry: ExerciseHistory = out.get(row.exercise_id) ?? {
      sets: [],
      lastPerformedDate: workout.date,
      workingRirs: [],
      previousAdjustment: workout.load_adjustments?.[row.exercise_id] ?? null,
    };
    entry.sets.push({
      set_number: row.set_number,
      reps: row.reps,
      rir: row.rir,
    });
    if (row.set_type !== "warmup" && row.completed_at != null) {
      entry.workingRirs.push(row.rir);
    }
    out.set(row.exercise_id, entry);
  }

  for (const entry of out.values()) {
    entry.sets.sort((a, b) => a.set_number - b.set_number);
  }
  return Object.fromEntries(out);
}

const toLatestSetsByExercise = (
  history: Record<string, ExerciseHistory>,
): Record<string, CompletedSetPerf[]> =>
  Object.fromEntries(
    Object.entries(history).map(([exerciseId, entry]) => [exerciseId, entry.sets]),
  );

/** Latest completed reps/RIR per exercise, used to gate progressive overload. */
export async function fetchLatestCompletedSetsByExercise(
  beforeDate: string,
  exerciseIds: string[],
): Promise<Record<string, CompletedSetPerf[]>> {
  return toLatestSetsByExercise(await fetchLatestExerciseHistory(beforeDate, exerciseIds));
}

async function fetchDraftSetContext(date: string, exerciseIds: string[]) {
  const supabase = await createClient();
  const [{ data: profile }, previousByKey, historyByExercise] =
    await Promise.all([
      supabase
        .from("user_training_profile")
        .select("body_weight")
        .eq("singleton", true)
        .maybeSingle(),
      fetchPreviousWeightsBeforeDate(date, exerciseIds),
      fetchLatestExerciseHistory(date, exerciseIds),
    ]);

  return {
    bodyWeight:
      profile?.body_weight == null ? null : Number(profile.body_weight),
    previousByKey,
    historyByExercise,
    latestPerfByExercise: toLatestSetsByExercise(historyByExercise),
  };
}

type DraftSetContext = Awaited<ReturnType<typeof fetchDraftSetContext>>;

type ExerciseDraftSource = {
  id: string;
  default_sets: number;
  default_reps: number | null;
  progressive_overload_increment: number | null;
  tracking_type: string | null;
  stretch_kind?: StretchKind | null;
  machine_start_weight: number | null;
  machine_end_weight: number | null;
  machine_increment: number | null;
};

const lastWeightsForExercise = (
  exerciseId: string,
  previousByKey: Record<string, number | null>,
): Record<string, number> => {
  const prefix = `${exerciseId}:`;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(previousByKey)) {
    if (!key.startsWith(prefix) || value == null) continue;
    out[key.slice(prefix.length)] = value;
  }
  return out;
};

const isAdjustable = (exercise: ExerciseDraftSource): boolean =>
  exercise.tracking_type !== "timed" && (exercise.stretch_kind ?? "none") === "none";

/** Per-exercise return-from-break adjustments for a draft dated `dateStr`; only exercises that need one. */
export function planAdjustmentsForExercises(
  dateStr: string,
  exercises: ExerciseDraftSource[],
  context: Pick<DraftSetContext, "previousByKey" | "historyByExercise">,
  overridePct?: number,
): LoadAdjustments {
  const adjustments: LoadAdjustments = {};
  for (const exercise of exercises) {
    const history = context.historyByExercise[exercise.id];
    if (!history || !isAdjustable(exercise)) continue;

    const adjustment = planReturnAdjustment({
      gapDays: daysBetween(history.lastPerformedDate, dateStr),
      previousAdjustment: history.previousAdjustment,
      lastSessionWorkingRirs: history.workingRirs,
      lastWeightsBySet: lastWeightsForExercise(exercise.id, context.previousByKey),
      overridePct,
    });
    if (adjustment) adjustments[exercise.id] = adjustment;
  }
  return adjustments;
}

const normalizeOverridePct = (percent: number | undefined): number | undefined => {
  if (percent === undefined || !Number.isFinite(percent)) return undefined;
  return Math.min(MAX_LOAD_ADJUSTMENT_PCT, Math.max(0, Math.round(percent)));
};

function adjustedWeight(
  exercise: ExerciseDraftSource,
  trackingType: TrackingType,
  adjustment: LoadAdjustment,
  setNumber: number,
  lastWeight: number | null,
  bodyWeight: number | null,
): number | null {
  switch (adjustment.phase) {
    case "hold":
      return lastWeight;
    case "first-session":
    case "ramp": {
      const referenceWeight = adjustment.referenceWeights[String(setNumber)] ?? lastWeight;
      if (referenceWeight == null) return null;
      return applyCutToWeight({
        trackingType,
        referenceWeight,
        cutPct: adjustment.cutPct,
        grid: machineGridFrom(exercise),
        stepFallback: overloadStepFor(exercise.progressive_overload_increment),
        bodyWeight,
      });
    }
    default: {
      const unreachable: never = adjustment.phase;
      return unreachable;
    }
  }
}

function buildDraftSetInsertRows(
  workoutId: string,
  exercise: ExerciseDraftSource,
  bodyWeight: number | null,
  previousByKey: Record<string, number | null>,
  latestPerfByExercise: Record<string, CompletedSetPerf[]>,
  adjustment: LoadAdjustment | null = null,
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
  const setCount = adjustment?.dropOneSet
    ? Math.max(1, exercise.default_sets - 1)
    : exercise.default_sets;

  return Array.from({ length: setCount }, (_, i) => {
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
      if (adjustment) {
        weight = adjustedWeight(exercise, tt, adjustment, set_number, lastW, bodyWeight);
      } else if (incrementConfigured != null) {
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

export type CreateWorkoutDraftOptions = {
  /** Explicit percent lighter (0–30) for this session; overrides the automatic tier. */
  loadAdjustmentPercent?: number;
};

const DRAFT_EXERCISE_COLUMNS =
  "id, default_sets, default_reps, progressive_overload_increment, tracking_type, stretch_kind, machine_start_weight, machine_end_weight, machine_increment, name, exercise_splits!inner(sort_order)";

/** Error message when `splitName` is not a known split, otherwise null. */
async function findSplitError(supabase: Supabase, splitName: string): Promise<string | null> {
  const { data: known, error: splitErr } = await supabase
    .from("workout_splits")
    .select("id")
    .eq("name", splitName)
    .maybeSingle();

  if (splitErr && !isWorkoutSplitsTableUnavailable(splitErr)) {
    return splitErr.message;
  }

  const splitsTableMissing =
    !!splitErr && isWorkoutSplitsTableUnavailable(splitErr);

  if (!splitsTableMissing && !known) {
    return "Unknown split. Add it under Settings → Splits.";
  }
  return null;
}

/** The split's exercises in split order (then name). */
async function fetchSplitExercises(supabase: Supabase, splitName: string) {
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select(DRAFT_EXERCISE_COLUMNS)
    .eq("exercise_splits.split_name", splitName)
    .order("name", { ascending: true });

  if (!error && exercises) {
    exercises.sort((a, b) => {
      const aSort = (a.exercise_splits as { sort_order: number }[])?.[0]?.sort_order ?? Infinity;
      const bSort = (b.exercise_splits as { sort_order: number }[])?.[0]?.sort_order ?? Infinity;
      return aSort - bSort || a.name.localeCompare(b.name);
    });
  }
  return { exercises, error };
}

/** Read-only preview of the return-from-break adjustment a new draft for `split` would get. */
export async function previewReturnPlan(split: string): Promise<GetReturnPlanOutput> {
  const splitName = split.trim();
  if (!splitName) return { error: "Choose a split" };

  const supabase = await createClient();

  const splitError = await findSplitError(supabase, splitName);
  if (splitError) return { error: splitError };

  const { exercises, error: eErr } = await fetchSplitExercises(supabase, splitName);
  if (eErr || !exercises?.length) {
    return { error: eErr?.message ?? "No exercises for this split" };
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const [context, { data: lastWorkout, error: lastErr }] = await Promise.all([
    fetchDraftSetContext(dateStr, exercises.map((e) => e.id)),
    supabase
      .from("workouts")
      .select("date")
      .eq("status", "completed")
      .is("deleted_at", null)
      .lte("date", dateStr)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (lastErr) throw new Error(lastErr.message);

  const adjustments = planAdjustmentsForExercises(dateStr, exercises, context);

  const planExercises: ReturnPlanExercise[] = exercises.map((ex) => {
    const lastPerformedDate = context.historyByExercise[ex.id]?.lastPerformedDate;
    const adjustment = adjustments[ex.id];
    return {
      exercise: ex.name,
      gapDays: lastPerformedDate ? daysBetween(lastPerformedDate, dateStr) : null,
      phase: adjustment?.phase ?? null,
      cutPct: adjustment?.cutPct ?? 0,
      dropOneSet: adjustment?.dropOneSet ?? false,
      targetRir: adjustment?.targetRir ?? NORMAL_TARGET_RIR,
    };
  });

  return {
    split: splitName,
    daysSinceLastWorkout: lastWorkout ? daysBetween(lastWorkout.date, dateStr) : null,
    exercises: planExercises,
    summary: summarizeLoadAdjustments(adjustments),
  };
}

export async function createWorkoutDraft(
  split: string,
  options: CreateWorkoutDraftOptions = {},
): Promise<{ id: string; loadAdjustments: LoadAdjustments }> {
  const splitName = split.trim();
  if (!splitName) throw new Error("Choose a split");

  const supabase = await createClient();

  const splitError = await findSplitError(supabase, splitName);
  if (splitError) throw new Error(splitError);

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const week = formatWorkoutWeek(today);

  // Parallelize the workout insert with the exercise lookup — these are
  // independent writes/reads, so there's no need to wait on one before
  // starting the other (#71).
  const [{ data: workout, error: wErr }, { exercises, error: eErr }] =
    await Promise.all([
      supabase
        .from("workouts")
        .insert({ date: dateStr, week, split: splitName, status: "draft" })
        .select("id")
        .single(),
      fetchSplitExercises(supabase, splitName),
    ]);

  if (wErr || !workout) {
    throw new Error(wErr?.message ?? "Failed to create workout");
  }

  if (eErr || !exercises?.length) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    throw new Error(eErr?.message ?? "No exercises for this split");
  }

  const exerciseIds = exercises.map((e) => e.id);

  const context = await fetchDraftSetContext(dateStr, exerciseIds);
  const { bodyWeight, previousByKey, latestPerfByExercise } = context;

  const loadAdjustments = planAdjustmentsForExercises(
    dateStr,
    exercises,
    context,
    normalizeOverridePct(options.loadAdjustmentPercent),
  );

  const rows = exercises.flatMap((ex) =>
    buildDraftSetInsertRows(
      workout.id,
      ex,
      bodyWeight,
      previousByKey,
      latestPerfByExercise,
      loadAdjustments[ex.id] ?? null,
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

  const hasAdjustments = Object.keys(loadAdjustments).length > 0;
  const [{ error: sErr }, { error: orderErr }, { error: adjErr }] = await Promise.all([
    supabase.from("workout_sets").insert(rows),
    supabase.from("workout_exercise_order").insert(orderRows),
    hasAdjustments
      ? supabase
          .from("workouts")
          .update({ load_adjustments: loadAdjustments })
          .eq("id", workout.id)
      : Promise.resolve({ error: null }),
  ]);
  if (sErr || orderErr || adjErr) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    throw new Error(sErr?.message ?? orderErr?.message ?? adjErr?.message);
  }

  return { id: workout.id, loadAdjustments };
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
    .select("id, date, split, load_adjustments")
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
      "id, default_sets, default_reps, progressive_overload_increment, tracking_type, stretch_kind, machine_start_weight, machine_end_weight, machine_increment",
    )
    .eq("id", exerciseId)
    .single();
  if (exErr || !exercise) {
    throw new Error(exErr?.message ?? "Exercise not found");
  }

  const context = await fetchDraftSetContext(draft.date, [exerciseId]);
  const { bodyWeight, previousByKey, latestPerfByExercise } = context;

  const adjustments = planAdjustmentsForExercises(draft.date, [exercise], context);

  const insertRows = buildDraftSetInsertRows(
    draft.id,
    exercise,
    bodyWeight,
    previousByKey,
    latestPerfByExercise,
    adjustments[exerciseId] ?? null,
  );

  if (insertRows.length === 0) return null;

  const { error: insertErr } = await supabase
    .from("workout_sets")
    .insert(insertRows);
  if (insertErr) throw new Error(insertErr.message);

  if (adjustments[exerciseId]) {
    const { error: adjErr } = await supabase
      .from("workouts")
      .update({ load_adjustments: { ...draft.load_adjustments, ...adjustments } })
      .eq("id", draft.id);
    if (adjErr) throw new Error(adjErr.message);
  }

  return draft.id;
}
