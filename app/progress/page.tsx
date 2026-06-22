import { ProgressCharts } from "@/components/progress/ProgressCharts";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export default async function ProgressPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const [weeklyRes, monthlyRes] = await Promise.all([
    supabase.from("weekly_volume_by_split").select("*"),
    supabase.from("monthly_volume_by_split").select("*"),
  ]);

  if (weeklyRes.error) {
    throw new Error(weeklyRes.error.message);
  }
  if (monthlyRes.error) {
    throw new Error(monthlyRes.error.message);
  }

  const rows = [...(weeklyRes.data ?? [])].sort(
    (a, b) =>
      String(a.split).localeCompare(String(b.split)) ||
      b.week.localeCompare(a.week) ||
      String(a.exercise).localeCompare(String(b.exercise)),
  );

  return (
    <div className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
          Progress
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Volume trends by split, exercise, and muscle group.
        </p>
      </div>

      {rows.length > 0 ? (
        <ProgressCharts
          weeklyRows={rows}
          monthlyRows={monthlyRes.data ?? []}
        />
      ) : null}

      <div className="mt-10 flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Weekly detail
        </h2>
        {rows.map((r, i) => (
          <div
            key={`${r.week}-${r.split}-${r.exercise}-${r.muscle}-${i}`}
            className="rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] p-3 text-sm transition hover:border-[var(--gym-amber)]/30 dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)] dark:hover:border-[var(--gym-amber)]/40"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                  {r.exercise}
                </p>
                <p className="text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                  {r.split} · {r.week} · {r.muscle}
                </p>
              </div>
              <dl className="font-data grid grid-cols-3 gap-x-4 gap-y-1 text-right text-xs tabular-nums sm:text-sm">
                <div>
                  <dt className="text-[var(--gray-500)] dark:text-[var(--gray-400)]">Sets</dt>
                  <dd className="font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">{r.total_sets}</dd>
                </div>
                <div>
                  <dt className="text-[var(--gray-500)] dark:text-[var(--gray-400)]">Reps</dt>
                  <dd className="font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                    {r.total_reps != null
                      ? Number(r.total_reps).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--gray-500)] dark:text-[var(--gray-400)]">Volume</dt>
                  <dd className="font-semibold text-[var(--gym-amber)]">
                    {r.total_volume != null
                      ? Math.round(Number(r.total_volume)).toLocaleString()
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Finish a workout to see weekly totals here.
        </p>
      ) : null}
    </div>
  );
}
