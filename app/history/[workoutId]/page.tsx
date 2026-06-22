import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteWorkoutButton } from "@/components/history/DeleteWorkoutButton";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { groupFlatSets } from "@/components/workout/groupSets";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { clampWorkoutElapsedSeconds, formatDurationSeconds } from "@/lib/duration";
import { hasSupabaseEnv } from "@/lib/env";
import { fetchSetsForWorkout } from "@/lib/queries/read";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ workoutId: string }> };

export default async function HistoryDetailPage({ params }: Props) {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const { workoutId } = await params;
  const supabase = await createClient();

  const { data: workout, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .maybeSingle();

  if (error || !workout) {
    notFound();
  }

  const rows = await fetchSetsForWorkout(workoutId);
  const groups = groupFlatSets(rows);
  const durationSeconds = clampWorkoutElapsedSeconds(
    workout.completed_at && workout.created_at
      ? Math.max(
          0,
          Math.round(
            (new Date(workout.completed_at).getTime() -
              new Date(workout.created_at).getTime()) /
              1000,
          ),
        )
      : null,
  );

  return (
    <div className="pb-28 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-2 px-4">
        <Link
          href="/history"
          className="inline-flex min-h-10 items-center justify-center rounded-lg px-2 font-semibold text-[var(--gym-amber)] hover:bg-[var(--gray-100)] dark:text-orange-400 dark:hover:bg-[var(--gray-800)]"
        >
          ← History
        </Link>
        <Link
          href={`/workout/${workoutId}`}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-4 font-semibold text-[var(--steel-gray)] hover:bg-[var(--gray-50)] dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)] dark:text-[var(--chalk-white)] dark:hover:bg-[var(--gray-800)]"
        >
          Open session
        </Link>
      </header>

      <div className="px-4 pt-3">
        <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">{workout.split}</h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          {workout.date} · {workout.week} ·{" "}
          {workout.status === "draft" ? "Draft" : "Completed"}
        </p>
        {workout.status === "completed" ? (
          <p className="mt-1 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
            Duration: {formatDurationSeconds(durationSeconds)}
          </p>
        ) : null}
      </div>

      <WorkoutSummary groups={groups} />

      <div className="px-4 pt-2">
        <DeleteWorkoutButton workoutId={workoutId} />
      </div>
    </div>
  );
}
