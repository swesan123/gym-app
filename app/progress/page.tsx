import { ProgressCharts } from "@/components/progress/ProgressCharts";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { fetchSplitsCatalog } from "@/lib/queries/read";

export default async function ProgressPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const [weeklyRes, monthlyRes, splitWeeklyRes, catalog] = await Promise.all([
    supabase.from("weekly_rep_capacity_by_exercise").select("*"),
    supabase.from("monthly_rep_capacity_by_exercise").select("*"),
    supabase.from("weekly_rep_capacity_by_split").select("*"),
    fetchSplitsCatalog(),
  ]);

  if (weeklyRes.error) {
    throw new Error(weeklyRes.error.message);
  }
  if (monthlyRes.error) {
    throw new Error(monthlyRes.error.message);
  }

  const rows = [...(weeklyRes.data ?? [])].sort(
    (a, b) =>
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
          RIR-adjusted rep capacity by exercise and muscle group.
        </p>
      </div>

      {rows.length > 0 ? (
        <ProgressCharts
          weeklyRows={rows}
          monthlyRows={monthlyRes.data ?? []}
          splitWeeklyRows={splitWeeklyRes.data ?? []}
          splitNames={catalog.splits.map((s) => s.name)}
        />
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Finish a workout to see weekly rep capacity here.
        </p>
      ) : null}
    </div>
  );
}
