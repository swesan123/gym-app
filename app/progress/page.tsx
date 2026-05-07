import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export default async function ProgressPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("weekly_volume_summary")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  const rows = [...(data ?? [])].sort(
    (a, b) =>
      b.week.localeCompare(a.week) ||
      String(a.exercise).localeCompare(String(b.exercise)),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">Progress</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Weekly volume by exercise and muscle (completed workouts).
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              <th className="px-3 py-3 font-semibold">Week</th>
              <th className="px-3 py-3 font-semibold">Exercise</th>
              <th className="px-3 py-3 font-semibold">Muscle</th>
              <th className="px-3 py-3 font-semibold text-right">Sets</th>
              <th className="px-3 py-3 font-semibold text-right">Reps</th>
              <th className="px-3 py-3 font-semibold text-right">Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.week}-${r.exercise}-${r.muscle}-${i}`}
                className="border-b border-zinc-100 odd:bg-white even:bg-zinc-50/80 dark:border-zinc-800 dark:odd:bg-zinc-900 dark:even:bg-zinc-800/40"
              >
                <td className="px-3 py-3 font-medium">{r.week}</td>
                <td className="px-3 py-3">{r.exercise}</td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                  {r.muscle}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {r.total_sets}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {r.total_reps != null
                    ? Number(r.total_reps).toLocaleString()
                    : "—"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold">
                  {r.total_volume != null
                    ? Math.round(Number(r.total_volume)).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Finish a workout to see weekly totals here.
        </p>
      ) : null}
    </div>
  );
}
