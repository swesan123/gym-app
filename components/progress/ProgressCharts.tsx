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

type ProgressRow = {
  week: string;
  exercise: string;
  muscle: string;
  total_volume: number | null;
};

export function ProgressCharts({ rows }: { rows: ProgressRow[] }) {
  const [exercise, setExercise] = useState<string>("");
  const [muscle, setMuscle] = useState<string>("");

  const exercises = useMemo(
    () => [...new Set(rows.map((r) => String(r.exercise)).filter(Boolean))].sort(),
    [rows],
  );
  const muscles = useMemo(
    () => [...new Set(rows.map((r) => String(r.muscle)).filter(Boolean))].sort(),
    [rows],
  );

  const selectedExercise = exercise || exercises[0] || "";
  const selectedMuscle = muscle || muscles[0] || "";

  const exerciseSeries = useMemo(() => {
    if (!selectedExercise) return [];
    return rows
      .filter((r) => r.exercise === selectedExercise)
      .sort((a, b) => a.week.localeCompare(b.week))
      .map((r) => ({
        week: r.week,
        volume: r.total_volume == null ? 0 : Number(r.total_volume),
      }));
  }, [rows, selectedExercise]);

  const muscleSeries = useMemo(() => {
    if (!selectedMuscle) return [];
    const acc = new Map<string, number>();
    for (const row of rows) {
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
  }, [rows, selectedMuscle]);

  return (
    <div className="mt-6 grid gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Exercise volume by week</h2>
          <label className="text-sm">
            <span className="mr-2 text-zinc-600 dark:text-zinc-400">Exercise</span>
            <select
              value={selectedExercise}
              onChange={(e) => setExercise(e.target.value)}
              className="min-h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {exercises.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
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
              <Line type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} />
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
              className="min-h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {muscles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
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
              <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
