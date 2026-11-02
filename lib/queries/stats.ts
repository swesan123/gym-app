import {
  workoutUrl,
  type ActiveDraft,
  type ExerciseProgressWeek,
  type ExerciseSummary,
  type GetActiveDraftOutput,
  type GetExerciseProgressOutput,
  type GetPersonalRecordsOutput,
  type GetRecentWorkoutsOutput,
  type GetTrainingProfileOutput,
  type ListExercisesOutput,
  type ListSplitsOutput,
  type PersonalRecord,
  type RecentWorkout,
  type ToolError,
} from "@/lib/ai/contracts";
import { UNASSIGNED_SPLIT_NAME } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { fetchBodyWeight, fetchSplitsCatalog } from "@/lib/queries/read";
import { estimateSetE1rm } from "@/lib/stats/e1rm";
import { computePersonalRecords, type RecordSetInput } from "@/lib/stats/records";
import { createClient } from "@/lib/supabase/server";

type Tables = Database["public"]["Tables"];
type ExerciseRow = Pick<
  Tables["exercises"]["Row"],
  "id" | "name" | "muscle" | "tracking_type" | "stretch_kind"
>;
type WorkoutIndexRow = Pick<Tables["workouts"]["Row"], "id" | "date" | "week">;
type SetRow = Pick<
  Tables["workout_sets"]["Row"],
  "workout_id" | "exercise_id" | "reps" | "weight" | "volume" | "set_type" | "completed_at"
>;
type ProgressViewRow = Pick<
  Database["public"]["Views"]["weekly_rep_capacity_by_exercise"]["Row"],
  | "week"
  | "max_adjusted_volume"
  | "best_volume"
  | "best_reps"
  | "best_rir"
  | "best_weight"
>;
type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

const PAGE_SIZE = 1000;
const MAX_EXERCISES = 100;
const MAX_CLOSE_MATCHES = 5;

const toNumberOrNull = (value: number | string | null | undefined): number | null => {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalize = (value: string) => value.trim().toLowerCase();

/** PostgREST caps responses at 1000 rows; page through with a stable order. */
const fetchAllPages = async <T>(fetchPage: (from: number, to: number) => PageResult<T>) => {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
};

const fetchActiveExercises = async (): Promise<ExerciseRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, muscle, tracking_type, stretch_kind")
    .is("archived_at", null)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExerciseRow[];
};

const findCloseMatches = (exercises: ExerciseRow[], query: string): string[] => {
  const needle = normalize(query);
  const tokens = needle.split(/\s+/).filter((t) => t.length > 2);
  return exercises
    .filter((e) => {
      const name = normalize(e.name);
      return (
        name.includes(needle) ||
        needle.includes(name) ||
        tokens.some((t) => name.includes(t))
      );
    })
    .slice(0, MAX_CLOSE_MATCHES)
    .map((e) => e.name);
};

const resolveExercise = (
  exercises: ExerciseRow[],
  query: string,
): ExerciseRow | ToolError => {
  const needle = normalize(query);
  const match = exercises.find((e) => normalize(e.name) === needle);
  if (match) return match;

  const close = findCloseMatches(exercises, query);
  const hint =
    close.length > 0
      ? `Did you mean: ${close.map((n) => `"${n}"`).join(", ")}?`
      : "Use listExercises to see valid names.";
  return { error: `No exercise named "${query}" found. ${hint}` };
};

const isToolError = (value: ExerciseRow | ToolError): value is ToolError => "error" in value;

/** Completed, non-deleted workouts keyed by id (date + ISO week). */
const fetchCompletedWorkoutIndex = async (): Promise<Map<string, WorkoutIndexRow>> => {
  const supabase = await createClient();
  const rows = await fetchAllPages<WorkoutIndexRow>((from, to) =>
    supabase
      .from("workouts")
      .select("id, date, week")
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, to),
  );
  return new Map(rows.map((w) => [w.id, w]));
};

/** Completed working sets, optionally scoped to one exercise. */
const fetchCompletedWorkingSets = async (exerciseId?: string): Promise<SetRow[]> => {
  const supabase = await createClient();
  return fetchAllPages<SetRow>((from, to) => {
    let query = supabase
      .from("workout_sets")
      .select("workout_id, exercise_id, reps, weight, volume, set_type, completed_at")
      .eq("set_type", "working")
      .not("completed_at", "is", null);
    if (exerciseId) query = query.eq("exercise_id", exerciseId);
    return query.order("id", { ascending: true }).range(from, to);
  });
};

const toRecordSetInput = (set: SetRow, date: string): RecordSetInput => ({
  date,
  weight: toNumberOrNull(set.weight),
  reps: toNumberOrNull(set.reps),
  volume: toNumberOrNull(set.volume),
  setType: set.set_type,
  completedAt: set.completed_at,
});

export async function listSplitsForChat(): Promise<ListSplitsOutput> {
  const { splits } = await fetchSplitsCatalog();
  return {
    splits: splits.map((s) => s.name).filter((name) => name !== UNASSIGNED_SPLIT_NAME),
  };
}

export async function listExercisesForChat(input: {
  split?: string;
  query?: string;
}): Promise<ListExercisesOutput> {
  const supabase = await createClient();
  const [exercises, splitRows] = await Promise.all([
    fetchActiveExercises(),
    supabase
      .from("exercise_splits")
      .select("exercise_id, split_name")
      .order("split_name", { ascending: true }),
  ]);
  if (splitRows.error) throw new Error(splitRows.error.message);

  const splitsByExercise = new Map<string, string[]>();
  for (const row of (splitRows.data ?? []) as { exercise_id: string; split_name: string }[]) {
    const names = splitsByExercise.get(row.exercise_id) ?? [];
    names.push(row.split_name);
    splitsByExercise.set(row.exercise_id, names);
  }

  const splitFilter = input.split ? normalize(input.split) : null;
  const queryFilter = input.query ? normalize(input.query) : null;

  const summaries = exercises
    .map(
      (e): ExerciseSummary => ({
        id: e.id,
        name: e.name,
        muscle: e.muscle,
        trackingType: e.tracking_type,
        splits: splitsByExercise.get(e.id) ?? [],
      }),
    )
    .filter((e) => {
      if (splitFilter && !e.splits.some((s) => normalize(s) === splitFilter)) return false;
      if (!queryFilter) return true;
      return (
        normalize(e.name).includes(queryFilter) || normalize(e.muscle).includes(queryFilter)
      );
    })
    .slice(0, MAX_EXERCISES);

  return { exercises: summaries };
}

export async function getRecentWorkouts(input: {
  limit: number;
}): Promise<GetRecentWorkoutsOutput> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, date, split, status, completed_at, created_at")
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(input.limit);
  if (error) throw new Error(error.message);

  const workouts = (data ?? []) as Pick<
    Tables["workouts"]["Row"],
    "id" | "date" | "split" | "status" | "completed_at" | "created_at"
  >[];
  if (workouts.length === 0) return { workouts: [] };

  const workoutIds = workouts.map((w) => w.id);
  const setRows = await fetchAllPages<{ workout_id: string; volume: number | null }>(
    (from, to) =>
      supabase
        .from("workout_sets")
        .select("workout_id, volume")
        .in("workout_id", workoutIds)
        .eq("set_type", "working")
        .not("completed_at", "is", null)
        .order("id", { ascending: true })
        .range(from, to),
  );

  const totals = new Map<string, { done: number; volume: number | null }>();
  for (const row of setRows) {
    const current = totals.get(row.workout_id) ?? { done: 0, volume: null };
    const volume = toNumberOrNull(row.volume);
    totals.set(row.workout_id, {
      done: current.done + 1,
      volume: volume == null ? current.volume : (current.volume ?? 0) + volume,
    });
  }

  return {
    workouts: workouts.map(
      (w): RecentWorkout => ({
        id: w.id,
        date: w.date,
        split: w.split,
        status: w.status,
        completedAt: w.completed_at,
        workingSetsDone: totals.get(w.id)?.done ?? 0,
        totalVolume: totals.get(w.id)?.volume ?? null,
        url: workoutUrl(w.id),
      }),
    ),
  };
}

export async function getExerciseProgress(input: {
  exercise: string;
  weeks: number;
}): Promise<GetExerciseProgressOutput> {
  const exercise = resolveExercise(await fetchActiveExercises(), input.exercise);
  if (isToolError(exercise)) return exercise;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_rep_capacity_by_exercise")
    .select("week, max_adjusted_volume, best_volume, best_reps, best_rir, best_weight")
    .eq("exercise_id", exercise.id)
    .order("week", { ascending: false })
    .limit(input.weeks);
  if (error) throw new Error(error.message);

  const viewRows = ((data ?? []) as ProgressViewRow[]).reverse();
  if (viewRows.length === 0) {
    return { exercise: exercise.name, trackingType: exercise.tracking_type, weeks: [] };
  }

  const [bodyWeight, workoutIndex, sets] = await Promise.all([
    fetchBodyWeight(),
    fetchCompletedWorkoutIndex(),
    fetchCompletedWorkingSets(exercise.id),
  ]);

  const bestE1rmByWeek = new Map<string, number>();
  for (const set of sets) {
    const week = workoutIndex.get(set.workout_id)?.week;
    if (!week) continue;
    const e1rm = estimateSetE1rm(
      exercise.tracking_type,
      { weight: toNumberOrNull(set.weight), reps: toNumberOrNull(set.reps) },
      bodyWeight,
    );
    if (e1rm == null) continue;
    if (e1rm > (bestE1rmByWeek.get(week) ?? 0)) bestE1rmByWeek.set(week, e1rm);
  }

  const weeks = viewRows.map((row): ExerciseProgressWeek => {
    const bestE1rm = bestE1rmByWeek.get(row.week);
    return {
      week: row.week,
      bestWeight: toNumberOrNull(row.best_weight),
      bestReps: toNumberOrNull(row.best_reps),
      bestRir: toNumberOrNull(row.best_rir),
      bestVolume: toNumberOrNull(row.best_volume),
      maxAdjustedVolume: toNumberOrNull(row.max_adjusted_volume),
      bestE1rm: bestE1rm == null ? null : Math.round(bestE1rm * 10) / 10,
    };
  });

  return { exercise: exercise.name, trackingType: exercise.tracking_type, weeks };
}

export async function getPersonalRecords(input: {
  exercise?: string;
}): Promise<GetPersonalRecordsOutput> {
  const allExercises = await fetchActiveExercises();

  let targets = allExercises.filter((e) => e.stretch_kind === "none");
  if (input.exercise) {
    const match = resolveExercise(allExercises, input.exercise);
    if (isToolError(match)) return match;
    if (match.stretch_kind !== "none") {
      return { error: `"${match.name}" is a stretch exercise; personal records are not tracked.` };
    }
    targets = [match];
  }

  const [bodyWeight, workoutIndex, sets] = await Promise.all([
    fetchBodyWeight(),
    fetchCompletedWorkoutIndex(),
    fetchCompletedWorkingSets(targets.length === 1 ? targets[0].id : undefined),
  ]);

  const setsByExercise = new Map<string, RecordSetInput[]>();
  for (const set of sets) {
    const date = workoutIndex.get(set.workout_id)?.date;
    if (!date) continue;
    const list = setsByExercise.get(set.exercise_id) ?? [];
    list.push(toRecordSetInput(set, date));
    setsByExercise.set(set.exercise_id, list);
  }

  const records: PersonalRecord[] = [];
  for (const exercise of targets) {
    const exerciseSets = setsByExercise.get(exercise.id);
    if (!exerciseSets && !input.exercise) continue;
    const record = computePersonalRecords(exerciseSets ?? [], {
      exercise: exercise.name,
      trackingType: exercise.tracking_type,
      bodyWeight,
    });
    const hasRecord =
      record.heaviestWeight || record.bestE1rm || record.mostReps || record.bestSetVolume;
    if (hasRecord || input.exercise) records.push(record);
  }

  return { records };
}

export async function getTrainingProfileForChat(): Promise<GetTrainingProfileOutput> {
  return { bodyWeight: await fetchBodyWeight() };
}

export async function getActiveDraft(): Promise<GetActiveDraftOutput> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, date, split")
    .eq("status", "draft")
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { draft: null };

  const workout = data as Pick<Tables["workouts"]["Row"], "id" | "date" | "split">;
  const { data: setData, error: setError } = await supabase
    .from("workout_sets")
    .select("completed_at")
    .eq("workout_id", workout.id)
    .eq("set_type", "working");
  if (setError) throw new Error(setError.message);

  const rows = (setData ?? []) as { completed_at: string | null }[];
  const draft: ActiveDraft = {
    workoutId: workout.id,
    split: workout.split,
    date: workout.date,
    workingSetsDone: rows.filter((r) => r.completed_at != null).length,
    workingSetsTotal: rows.length,
    url: workoutUrl(workout.id),
  };
  return { draft };
}
