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

export type WeeklyVolumeByExerciseRow =
  Database["public"]["Views"]["weekly_volume_by_exercise"]["Row"];

export type MonthlyVolumeByExerciseRow =
  Database["public"]["Views"]["monthly_volume_by_exercise"]["Row"];

export type WeeklyVolumeBySplitRow =
  Database["public"]["Views"]["weekly_volume_by_split"]["Row"];

type Props = {
  weeklyRows: WeeklyVolumeByExerciseRow[];
  monthlyRows: MonthlyVolumeByExerciseRow[];
  splitWeeklyRows: WeeklyVolumeBySplitRow[];
  splitNames: string[];
};

export function ProgressCharts({ weeklyRows, monthlyRows, splitWeeklyRows, splitNames }: Props) {
  const [split, setSplit] = useState<string>("");
  const [exercise, setExercise] = useState<string>("");
  const [muscle, setMuscle] = useState<string>("");

  // Rows used only for populating dropdowns — scoped to selected split when one is chosen.
  const navigationRows: Array<{ week: string; exercise: string | null; muscle: string | null; total_volume: number | null }> = useMemo(() => {
    if (split) {
      return splitWeeklyRows.filter((r) => r.split === split);
    }
    return weeklyRows;
  }, [split, splitWeeklyRows, weeklyRows]);

  // Build exercise → muscle mapping from navigation rows for auto-linking (#62)
  const exerciseToMuscle = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of navigationRows) {
      if (r.exercise && r.muscle) map.set(String(r.exercise), String(r.muscle));
    }
    return map;
  }, [navigationRows]);

  // Dropdown options — scoped to the selected split
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

  // Chart series always use weeklyRows (all-splits totals) regardless of split filter.
  const exerciseSeries = useMemo(() => {
    if (!selectedExercise) return [];
    return weeklyRows
      .filter((r) => r.exercise === selectedExercise)
      .sort((a, b) => String(a.week).localeCompare(String(b.week)))
      .map((r) => ({
        week: r.week,
        volume: r.total_volume == null ? 0 : Number(r.total_volume),
      }));
  }, [weeklyRows, selectedExercise]);

  const muscleSeries = useMemo(() => {
    if (!selectedMuscle) return [];
    const acc = new Map<string, number>();
    for (const row of weeklyRows) {
      if (row.muscle !== selectedMuscle) continue;
      acc.set(
        String(row.week),
        (acc.get(String(row.week)) ?? 0) +
          (row.total_volume == null ? 0 : Number(row.total_volume)),
      );
    }
    return [...acc.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, volume]) => ({ week, volume }));
  }, [weeklyRows, selectedMuscle]);

  const momDisplay = useMemo(() => {
    const rows = monthlyRows
      .map((r) => ({
        month: String(r.month_start),
        vol: r.total_volume == null ? 0 : Number(r.total_volume),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    if (rows.length < 2) return null;
    const prev = rows[rows.length - 2];
    const curr = rows[rows.length - 1];
    if (prev.vol <= 0) {
      if (curr.vol <= 0) return null;
      return { kind: "new_baseline" as const };
    }
    return {
      kind: "pct" as const,
      value: ((curr.vol - prev.vol) / prev.vol) * 100,
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="text-base font-semibold">Overall trends</h2>
        </div>

        {momDisplay?.kind === "pct" ? (
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Month-over-month total volume (latest vs prior calendar month):{" "}
            <span className="font-semibold tabular-nums">
              {momDisplay.value >= 0 ? "+" : ""}
              {momDisplay.value.toFixed(1)}%
            </span>
          </p>
        ) : momDisplay?.kind === "new_baseline" ? (
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Month-over-month: prior month had no logged volume; current month is
            your new baseline.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Need two completed months with volume to show month-over-month trend.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Exercise volume by week</h2>
          <label className="text-sm">
            <span className="mr-2 text-zinc-600 dark:text-zinc-400">
              Exercise
            </span>
            <select
              value={selectedExercise}
              onChange={(e) => {
                const name = e.target.value;
                setExercise(name);
                // Auto-sync muscle chart to the selected exercise (#62)
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
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={exerciseSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Muscle volume by week</h2>
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
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={muscleSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="volume"
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
