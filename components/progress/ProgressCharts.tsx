"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Database } from "@/lib/database.types";

export type WeeklyRepCapacityByExerciseRow =
  Database["public"]["Views"]["weekly_rep_capacity_by_exercise"]["Row"];

export type MonthlyRepCapacityByExerciseRow =
  Database["public"]["Views"]["monthly_rep_capacity_by_exercise"]["Row"];

export type WeeklyRepCapacityBySplitRow =
  Database["public"]["Views"]["weekly_rep_capacity_by_split"]["Row"];

type Props = {
  weeklyRows: WeeklyRepCapacityByExerciseRow[];
  monthlyRows: MonthlyRepCapacityByExerciseRow[];
  splitWeeklyRows: WeeklyRepCapacityBySplitRow[];
  splitNames: string[];
};

type ExerciseChartPoint = {
  week: string;
  adjustedVolume: number;
  bestVolume: number | null;
  bestReps: number | null;
  bestRir: number | null;
  bestWeight: number | null;
};

function ExerciseTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ExerciseChartPoint }>;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-semibold">Week {p.week}</p>
      <p>Adjusted volume: {Math.round(p.adjustedVolume).toLocaleString()}</p>
      <p className="text-zinc-600 dark:text-zinc-400">
        Best set: {p.bestReps ?? "—"} reps @ RIR {p.bestRir ?? "—"}
        {p.bestWeight != null ? ` · ${p.bestWeight} load` : ""}
        {p.bestVolume != null
          ? ` · vol ${Math.round(p.bestVolume).toLocaleString()}`
          : ""}
      </p>
    </div>
  );
}

export function ProgressCharts({
  weeklyRows,
  monthlyRows,
  splitWeeklyRows,
  splitNames,
}: Props) {
  const [split, setSplit] = useState<string>("");
  const [exercise, setExercise] = useState<string>("");
  const [muscle, setMuscle] = useState<string>("");

  const navigationRows = useMemo(() => {
    if (split) {
      return splitWeeklyRows.filter((r) => r.split === split);
    }
    return weeklyRows;
  }, [split, splitWeeklyRows, weeklyRows]);

  const exerciseToMuscle = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of navigationRows) {
      if (r.exercise && r.muscle) map.set(String(r.exercise), String(r.muscle));
    }
    return map;
  }, [navigationRows]);

  const exercises = useMemo(() => {
    const names = new Set<string>();
    for (const r of navigationRows) {
      if (r.exercise) names.add(String(r.exercise));
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [navigationRows]);

  const muscles = useMemo(() => {
    const names = new Set<string>();
    for (const r of navigationRows) {
      if (r.muscle) names.add(String(r.muscle));
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [navigationRows]);

  const selectedExercise = exercise || exercises[0] || "";
  const selectedMuscle = muscle || muscles[0] || "";

  const exerciseSeries = useMemo((): ExerciseChartPoint[] => {
    if (!selectedExercise) return [];
    return weeklyRows
      .filter((r) => r.exercise === selectedExercise)
      .sort((a, b) => String(a.week).localeCompare(String(b.week)))
      .map((r) => ({
        week: String(r.week),
        adjustedVolume:
          r.max_adjusted_volume == null ? 0 : Number(r.max_adjusted_volume),
        bestVolume: r.best_volume == null ? null : Number(r.best_volume),
        bestReps: r.best_reps == null ? null : Number(r.best_reps),
        bestRir: r.best_rir == null ? null : Number(r.best_rir),
        bestWeight: r.best_weight == null ? null : Number(r.best_weight),
      }));
  }, [weeklyRows, selectedExercise]);

  const muscleSeries = useMemo(() => {
    if (!selectedMuscle) return [];
    const acc = new Map<string, number>();
    for (const row of weeklyRows) {
      if (row.muscle !== selectedMuscle) continue;
      const week = String(row.week);
      const vol =
        row.max_adjusted_volume == null ? 0 : Number(row.max_adjusted_volume);
      acc.set(week, Math.max(acc.get(week) ?? 0, vol));
    }
    return [...acc.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, adjustedVolume]) => ({ week, adjustedVolume }));
  }, [weeklyRows, selectedMuscle]);

  const momDisplay = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const r of monthlyRows) {
      const month = String(r.month_start);
      const vol =
        r.total_adjusted_volume == null ? 0 : Number(r.total_adjusted_volume);
      byMonth.set(month, (byMonth.get(month) ?? 0) + vol);
    }
    const rows = [...byMonth.entries()]
      .map(([month, adjustedVolume]) => ({ month, adjustedVolume }))
      .sort((a, b) => a.month.localeCompare(b.month));
    if (rows.length < 2) return null;
    const prev = rows[rows.length - 2];
    const curr = rows[rows.length - 1];
    if (prev.adjustedVolume <= 0) {
      if (curr.adjustedVolume <= 0) return null;
      return { kind: "new_baseline" as const };
    }
    return {
      kind: "pct" as const,
      value:
        ((curr.adjustedVolume - prev.adjustedVolume) / prev.adjustedVolume) *
        100,
    };
  }, [monthlyRows]);

  return (
    <div className="mt-6 grid gap-4">
      {splitNames.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--gray-600)] dark:text-[var(--gray-400)]">
            Filter exercises by split
          </label>
          <select
            value={split}
            onChange={(e) => {
              setSplit(e.target.value);
              setExercise("");
              setMuscle("");
            }}
            className="min-h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="">All splits</option>
            {splitNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {split && exercises.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No logged sets for this split yet. Finish a workout with exercises
          assigned to {split}.
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="text-base font-semibold">Overall trends</h2>
        </div>

        {momDisplay?.kind === "pct" ? (
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Month-over-month adjusted volume (sum across exercises, latest vs
            prior month):{" "}
            <span className="font-semibold tabular-nums">
              {momDisplay.value >= 0 ? "+" : ""}
              {momDisplay.value.toFixed(1)}%
            </span>
          </p>
        ) : momDisplay?.kind === "new_baseline" ? (
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Month-over-month: prior month had no logged adjusted volume; current
            month is your new baseline.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Need two completed months with adjusted volume data to show
            month-over-month trend.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold">
            Exercise adjusted volume by week
          </h2>
          <label className="text-sm">
            <span className="mr-2 text-zinc-600 dark:text-zinc-400">
              Exercise
            </span>
            <select
              value={selectedExercise}
              onChange={(e) => {
                const name = e.target.value;
                setExercise(name);
                const mapped = exerciseToMuscle.get(name);
                if (mapped) setMuscle(mapped);
              }}
              disabled={exercises.length === 0}
              className="min-h-10 max-w-[min(100%,14rem)] rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {exercises.length === 0 ? (
                <option value="">No exercises</option>
              ) : (
                exercises.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Best set each week: volume × 1/(1 − 0.03×RIR). Missing RIR counts as
          plain volume.
        </p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={exerciseSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip content={<ExerciseTooltip />} />
              <Line
                type="monotone"
                dataKey="adjustedVolume"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold">
            Muscle adjusted volume by week
          </h2>
          <label className="text-sm">
            <span className="mr-2 text-zinc-600 dark:text-zinc-400">Muscle</span>
            <select
              value={selectedMuscle}
              onChange={(e) => setMuscle(e.target.value)}
              disabled={muscles.length === 0}
              className="min-h-10 max-w-[min(100%,12rem)] rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {muscles.length === 0 ? (
                <option value="">No muscles</option>
              ) : (
                muscles.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Peak adjusted volume across exercises for this muscle group each week.
        </p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={muscleSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="adjustedVolume"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
