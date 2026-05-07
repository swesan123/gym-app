import Link from "next/link";

import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export default async function HistoryPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const ids = workouts?.map((w) => w.id) ?? [];
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

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">History</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Tap a workout for details.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {(workouts ?? []).map((w) => {
          const vol = volumeMap.get(w.id) ?? 0;
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

      {(workouts ?? []).length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No workouts yet.
        </p>
      ) : null}
    </div>
  );
}
