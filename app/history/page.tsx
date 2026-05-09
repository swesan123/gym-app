import Link from "next/link";

import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { formatDurationSeconds } from "@/lib/duration";
import { hasSupabaseEnv } from "@/lib/env";
import { fetchSplitsCatalog } from "@/lib/queries/read";
import { createClient } from "@/lib/supabase/server";

import type { Database } from "@/lib/database.types";

type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];

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
  const ra = splitsOrder.indexOf(a.split);
  const rb = splitsOrder.indexOf(b.split);
  const pa = ra >= 0 ? ra : 10_000;
  const pb = rb >= 0 ? rb : 10_000;
  if (pa !== pb) return pa - pb;
  const sc = a.split.localeCompare(b.split);
  if (sc !== 0) return sc;
  const dc = b.date.localeCompare(a.date);
  if (dc !== 0) return dc;
  return (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default async function HistoryPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const [{ data: workouts, error }, catalog] = await Promise.all([
    supabase
      .from("workouts")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    fetchSplitsCatalog(),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const list = workouts ?? [];
  const splitNamesOrder = catalog.splits.map((s) => s.name);

  const ids = list.map((w) => w.id);
  const volumeMap = new Map<string, number>();

  if (ids.length > 0) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("workout_id, volume")
      .in("workout_id", ids);

    for (const s of sets ?? []) {
      const cur = volumeMap.get(s.workout_id) ?? 0;
      volumeMap.set(s.workout_id, cur + (Number(s.volume) || 0));
    }
  }

  const uniqueWeeks = [...new Set(list.map((w) => w.week))].sort((a, b) =>
    b.localeCompare(a),
  );

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">History</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Grouped by week. Tap a workout for details.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        {uniqueWeeks.map((weekKey) => {
          const inWeek = list
            .filter((w) => w.week === weekKey)
            .sort((a, b) => compareWorkoutsInWeek(a, b, splitNamesOrder));
          return (
            <section key={weekKey}>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {formatWeekHeading(weekKey)}
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {inWeek.map((w) => {
                  const vol = volumeMap.get(w.id) ?? 0;
                  const durationSeconds =
                    w.completed_at && w.created_at
                      ? Math.max(
                          0,
                          Math.round(
                            (new Date(w.completed_at).getTime() -
                              new Date(w.created_at).getTime()) /
                              1000,
                          ),
                        )
                      : null;
                  return (
                    <li key={w.id}>
                      <Link
                        href={`/history/${w.id}`}
                        className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{w.split}</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {w.date}
                              {w.status === "draft" ? " · Draft" : ""}
                            </p>
                            {w.status === "completed" ? (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Duration:{" "}
                                {formatDurationSeconds(durationSeconds)}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-zinc-500">Volume</p>
                            <p className="text-lg font-bold">
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
        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No workouts yet.
        </p>
      ) : null}
    </div>
  );
}
