import Link from "next/link";

import { discardDraft } from "@/app/actions/workouts";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export default async function HomePage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString().slice(0, 10);

  const [{ data: draft }, { data: recentByDate }] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("id, split")
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workouts")
        .select("id, split, date")
        .eq("status", "completed")
        .gte("date", since)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Gym Tracker
      </h1>

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
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/workout/${draft.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Continue workout
            </Link>
            <form action={discardDraft.bind(null, draft.id)}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Discard
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Last 7 days
        </h2>
        {recentByDate && recentByDate.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {recentByDate.map((workout) => (
              <li
                key={workout.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="font-semibold">{workout.split}</span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {" "}
                  · {workout.date}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            No completed workouts in the last 7 days.
          </p>
        )}
      </section>
    </div>
  );
}
