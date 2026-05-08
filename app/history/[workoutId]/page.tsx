import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteWorkoutButton } from "@/components/history/DeleteWorkoutButton";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { groupFlatSets } from "@/components/workout/groupSets";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { formatDurationSeconds } from "@/lib/duration";
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
  const durationSeconds =
    workout.completed_at && workout.created_at
      ? Math.max(
          0,
          Math.round(
            (new Date(workout.completed_at).getTime() -
              new Date(workout.created_at).getTime()) /
              1000,
          ),
        )
      : null;

  return (
    <div className="pb-28 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4">
        <Link
          href="/history"
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-2 font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          ← History
        </Link>
        <Link
          href={`/workout/${workoutId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Open session
        </Link>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-3">
        <h1 className="text-2xl font-bold">{workout.split}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {workout.date} · {workout.week} ·{" "}
          {workout.status === "draft" ? "Draft" : "Completed"}
        </p>
        {workout.status === "completed" ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Duration: {formatDurationSeconds(durationSeconds)}
          </p>
        ) : null}
      </div>

      <WorkoutSummary groups={groups} />

      <div className="mx-auto max-w-lg px-4 pt-2">
        <DeleteWorkoutButton workoutId={workoutId} />
      </div>
    </div>
  );
}
