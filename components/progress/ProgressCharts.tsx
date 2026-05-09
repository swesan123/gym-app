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

export type WeeklyVolumeBySplitRow =
  Database["public"]["Views"]["weekly_volume_by_split"]["Row"];

export type MonthlyVolumeBySplitRow =
  Database["public"]["Views"]["monthly_volume_by_split"]["Row"];

type Props = {
  weeklyRows: WeeklyVolumeBySplitRow[];
  monthlyRows: MonthlyVolumeBySplitRow[];
};

export function ProgressCharts({ weeklyRows, monthlyRows }: Props) {
  const splits = useMemo(
    () =>
      [...new Set(weeklyRows.map((r) => String(r.split)).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [weeklyRows],
  );

  const [split, setSplit] = useState<string>("");
  const [exercise, setExercise] = useState<string>("");
  const [muscle, setMuscle] = useState<string>("");

  const selectedSplit = split || splits[0] || "";

  const filteredWeekly = useMemo(
    () =>
      selectedSplit
        ? weeklyRows.filter((r) => r.split === selectedSplit)
        : weeklyRows,
    [weeklyRows, selectedSplit],
  );

  const exercises = useMemo(() => {
    const names = new Set<string>();
    for (const r of filteredWeekly) {
      if (r.exercise) names.add(String(r.exercise));
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [filteredWeekly]);

  const muscles = useMemo(() => {
    const names = new Set<string>();
    for (const r of filteredWeekly) {
      if (r.muscle) names.add(String(r.muscle));
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [filteredWeekly]);

  const selectedExercise = exercise || exercises[0] || "";
  const selectedMuscle = muscle || muscles[0] || "";

  const exerciseSeries = useMemo(() => {
    if (!selectedExercise || !selectedSplit) return [];
    return filteredWeekly
      .filter((r) => r.exercise === selectedExercise)
      .sort((a, b) => a.week.localeCompare(b.week))
      .map((r) => ({
        week: r.week,
        volume: r.total_volume == null ? 0 : Number(r.total_volume),
      }));
  }, [filteredWeekly, selectedExercise, selectedSplit]);

  const muscleSeries = useMemo(() => {
    if (!selectedMuscle || !selectedSplit) return [];
    const acc = new Map<string, number>();
    for (const row of filteredWeekly) {
      if (row.muscle !== selectedMuscle) continue;
      acc.set(
        row.week,
        (acc.get(row.week) ?? 0) +
          (row.total_volume == null ? 0 : Number(row.total_volume)),
      );
    }
    return [...acc.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, volume]) => ({ week, volume }));
  }, [filteredWeekly, selectedMuscle, selectedSplit]);

  const momDisplay = useMemo(() => {
    if (!selectedSplit) return null;
    const rows = monthlyRows
      .filter((r) => r.split === selectedSplit)
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
  }, [monthlyRows, selectedSplit]);

  return (
    <div className="mt-6 grid gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="text-base font-semibold">Split & trends</h2>
          <label className="text-sm">
            <span className="mr-2 text-zinc-600 dark:text-zinc-400">Split</span>
            <select
              value={selectedSplit}
              onChange={(e) => {
                setSplit(e.target.value);
                setExercise("");
                setMuscle("");
              }}
              className="min-h-10 max-w-[14rem] rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {splits.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        {momDisplay?.kind === "pct" ? (
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Month-over-month volume (latest vs prior calendar month):{" "}
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
        ) : selectedSplit ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Need two completed months with volume on this split to show MoM %.
          </p>
        ) : null}
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
              onChange={(e) => setExercise(e.target.value)}
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
