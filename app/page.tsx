import Link from "next/link";

import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { formatWorkoutWeek } from "@/lib/week";

export default async function HomePage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();
  const week = formatWorkoutWeek(new Date());

  const [{ data: recent }, { data: draft }, { data: weekWorkouts }] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workouts")
        .select("id, split")
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workouts")
        .select("id")
        .eq("week", week)
        .eq("status", "completed"),
    ]);

  const ids = weekWorkouts?.map((w) => w.id) ?? [];

  let setCount = 0;
  let volumeTotal = 0;

  if (ids.length > 0) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("volume")
      .in("workout_id", ids);

    setCount = sets?.length ?? 0;
    volumeTotal =
      sets?.reduce((acc, s) => acc + (Number(s.volume) || 0), 0) ?? 0;
  }

  const workoutCount = ids.length;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Gym Tracker
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Log fast. No spreadsheet rows.
      </p>

      <div className="mt-8">
        <Link
          href="/workout/start"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
        >
          Start workout
        </Link>
      </div>

      {draft ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Draft in progress
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            {draft.split}
          </p>
          <Link
            href={`/workout/${draft.id}`}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Continue workout
          </Link>
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          This week ({week})
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/80">
            <dt className="text-xs text-zinc-500">Workouts</dt>
            <dd className="text-xl font-bold">{workoutCount}</dd>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/80">
            <dt className="text-xs text-zinc-500">Sets</dt>
            <dd className="text-xl font-bold">{setCount}</dd>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/80">
            <dt className="text-xs text-zinc-500">Volume</dt>
            <dd className="text-xl font-bold">
              {Math.round(volumeTotal).toLocaleString()}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Most recent workout
        </h2>
        {recent ? (
          <Link
            href={`/history/${recent.id}`}
            className="mt-3 block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <p className="font-semibold">{recent.split}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {recent.date} · {recent.status === "draft" ? "Draft" : "Completed"}
            </p>
          </Link>
        ) : (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            No workouts yet.
          </p>
        )}
      </section>
    </div>
  );
}
