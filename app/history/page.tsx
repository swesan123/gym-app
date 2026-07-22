import Link from "next/link";

import { CopyHistoryButton } from "@/components/history/CopyHistoryButton";
import { RestoreWorkoutButton } from "@/components/history/RestoreWorkoutButton";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { clampWorkoutElapsedSeconds, formatDurationSeconds } from "@/lib/duration";
import { hasSupabaseEnv } from "@/lib/env";
import {
  computeCoreSplits,
  missingSplitsForWeek,
  type WeeklySplitCounts,
} from "@/lib/missingSplits";
import { fetchSplitsCatalog } from "@/lib/queries/read";
import { createClient } from "@/lib/supabase/server";
import { formatWorkoutWeek } from "@/lib/week";

import type { Database } from "@/lib/database.types";

type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];
type TrackingType = Database["public"]["Tables"]["exercises"]["Row"]["tracking_type"];
type HistorySetRow = {
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  duration_seconds: number | null;
  volume: number | null;
  note: string | null;
  exercises: {
    name: string | null;
    tracking_type: TrackingType | null;
  } | null;
};

function formatWeekHeading(weekStr: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekStr.trim());
  if (!m) return weekStr;
  return `${m[1]} - Week ${parseInt(m[2], 10)}`;
}

function compareWorkoutsInWeek(
  a: WorkoutRow,
  b: WorkoutRow,
  splitsOrder: string[],
): number {
  // Newest date first within a week
  const dc = b.date.localeCompare(a.date);
  if (dc !== 0) return dc;
  const tc = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (tc !== 0) return tc;
  const ra = splitsOrder.indexOf(a.split);
  const rb = splitsOrder.indexOf(b.split);
  const pa = ra >= 0 ? ra : 10_000;
  const pb = rb >= 0 ? rb : 10_000;
  if (pa !== pb) return pa - pb;
  return a.split.localeCompare(b.split);
}

function formatWeight(tt: TrackingType | null, weight: number | null): string {
  if (weight == null) return "wt —";
  if (tt === "bodyweight") return `extra ${weight}`;
  return `wt ${weight}`;
}

function buildHistoryCopyPayload(input: {
  workouts: WorkoutRow[];
  weekKeys: string[];
  splitOrder: string[];
  volumeMap: Map<string, number>;
  setsByWorkout: Map<string, HistorySetRow[]>;
}): string {
  const lines: string[] = [];
  lines.push("Workout History");
  lines.push("");

  for (const weekKey of input.weekKeys) {
    lines.push(`## ${formatWeekHeading(weekKey)}`);
    const workoutsInWeek = input.workouts
      .filter((w) => w.week === weekKey)
      .sort((a, b) => compareWorkoutsInWeek(a, b, input.splitOrder));

    for (const w of workoutsInWeek) {
      const vol = input.volumeMap.get(w.id) ?? 0;
      const status = w.status === "draft" ? "Draft" : "Completed";
      lines.push(
        `- ${w.split} (${w.date}) — ${status} — Volume ${Math.round(vol).toLocaleString()}`,
      );

      const setRows = input.setsByWorkout.get(w.id) ?? [];
      const byExercise = new Map<string, HistorySetRow[]>();
      for (const row of setRows) {
        const key = row.exercise_id;
        const list = byExercise.get(key) ?? [];
        list.push(row);
        byExercise.set(key, list);
      }

      for (const [, exerciseSets] of byExercise) {
        const sortedSets = [...exerciseSets].sort(
          (a, b) => a.set_number - b.set_number,
        );
        const first = sortedSets[0];
        const exerciseName = first.exercises?.name ?? "Unknown exercise";
        const tt = first.exercises?.tracking_type ?? null;
        lines.push(`  - ${exerciseName}`);
        for (const s of sortedSets) {
          const repOrTime =
            tt === "timed"
              ? `time ${s.duration_seconds ?? "—"}s`
              : `reps ${s.reps ?? "—"}`;
          const rir = s.rir == null ? "rir —" : `rir ${s.rir}`;
          const volSet =
            s.volume == null ? "vol —" : `vol ${Math.round(s.volume)}`;
          const note = s.note?.trim() ? `; note: ${s.note.trim()}` : "";
          lines.push(
            `    - Set ${s.set_number}: ${repOrTime}, ${formatWeight(tt, s.weight)}, ${rir}, ${volSet}${note}`,
          );
        }
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export default async function HistoryPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const [{ data: workouts, error }, { data: deletedWorkouts }, catalog] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("*")
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("workouts")
        .select("id, date, week, split, status")
        .not("deleted_at", "is", null)
        .order("date", { ascending: false })
        .limit(50),
      fetchSplitsCatalog(),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const list = workouts ?? [];
  const splitNamesOrder = catalog.splits.map((s) => s.name);

  const ids = list.map((w) => w.id);
  const volumeMap = new Map<string, number>();
  const setsByWorkout = new Map<string, HistorySetRow[]>();

  if (ids.length > 0) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select(
        `
        workout_id,
        exercise_id,
        set_number,
        reps,
        weight,
        rir,
        duration_seconds,
        volume,
        note,
        exercises(name, tracking_type)
      `,
      )
      .in("workout_id", ids);

    for (const s of sets ?? []) {
      const cur = volumeMap.get(s.workout_id) ?? 0;
      volumeMap.set(s.workout_id, cur + (Number(s.volume) || 0));

      const workoutRows = setsByWorkout.get(s.workout_id) ?? [];
      workoutRows.push(s as unknown as HistorySetRow);
      setsByWorkout.set(s.workout_id, workoutRows);
    }
  }

  const uniqueWeeks = [...new Set(list.map((w) => w.week))].sort((a, b) =>
    b.localeCompare(a),
  );

  const currentWeekKey = formatWorkoutWeek(new Date());
  const weeklyCompletedSplits: WeeklySplitCounts = new Map();
  for (const w of list) {
    if (w.status !== "completed") continue;
    const splits = weeklyCompletedSplits.get(w.week) ?? new Set<string>();
    splits.add(w.split);
    weeklyCompletedSplits.set(w.week, splits);
  }
  const elapsedWeekKeys = uniqueWeeks.filter((w) => w !== currentWeekKey);
  const coreSplits = computeCoreSplits(
    weeklyCompletedSplits,
    elapsedWeekKeys.slice(0, 8),
  );

  const copyPayload = buildHistoryCopyPayload({
    workouts: list,
    weekKeys: uniqueWeeks,
    splitOrder: splitNamesOrder,
    volumeMap,
    setsByWorkout,
  });

  return (
    <div className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
            History
          </h1>
          <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
            Grouped by week. Tap a workout for details.
          </p>
        </div>
        <CopyHistoryButton payload={copyPayload} />
      </div>

      <div className="flex flex-col gap-8">
        {uniqueWeeks.map((weekKey) => {
          const inWeek = list
            .filter((w) => w.week === weekKey)
            .sort((a, b) => compareWorkoutsInWeek(a, b, splitNamesOrder));
          const missingSplits =
            weekKey === currentWeekKey
              ? []
              : missingSplitsForWeek(weeklyCompletedSplits, weekKey, coreSplits);
          return (
            <section key={weekKey}>
              <h2 className="text-lg font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                {formatWeekHeading(weekKey)}
              </h2>
              {missingSplits.length > 0 ? (
                <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  ⚠ Missing: {missingSplits.join(", ")}
                </p>
              ) : null}
              <ul className="mt-4 flex flex-col gap-3">
                {inWeek.map((w) => {
                  const vol = volumeMap.get(w.id) ?? 0;
                  const durationSeconds = clampWorkoutElapsedSeconds(
                    w.completed_at && w.created_at
                      ? Math.max(
                          0,
                          Math.round(
                            (new Date(w.completed_at).getTime() -
                              new Date(w.created_at).getTime()) /
                              1000,
                          ),
                        )
                      : null,
                  );
                  return (
                    <li key={w.id}>
                      <Link
                        href={`/history/${w.id}`}
                        className="block rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] p-4 transition hover:border-[var(--gym-amber)]/50 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)] dark:hover:border-[var(--gym-amber)]/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                              {w.split}
                            </p>
                            <p className="text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                              {w.date}
                              {w.status === "draft" ? " · Draft" : ""}
                            </p>
                            {w.status === "completed" ? (
                              <p className="text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                                Duration:{" "}
                                {formatDurationSeconds(durationSeconds)}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                              Volume
                            </p>
                            <p className="font-data text-xl font-bold text-[var(--gym-amber)]">
                              {Math.round(vol).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {list.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          No workouts yet.
        </p>
      ) : null}

      {deletedWorkouts && deletedWorkouts.length > 0 ? (
        <section className="mt-10 border-t border-[var(--gray-200)] pt-6 dark:border-[var(--gray-100)]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--gray-500)] dark:text-[var(--gray-400)]">
            Recently deleted
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {deletedWorkouts.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] p-4 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]"
              >
                <div>
                  <p className="font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                    {w.split}
                  </p>
                  <p className="text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                    {w.date}
                    {w.status === "draft" ? " · Draft" : ""}
                  </p>
                </div>
                <RestoreWorkoutButton workoutId={w.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
