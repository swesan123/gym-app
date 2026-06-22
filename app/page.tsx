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
    <div className="px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
          Gym Tracker
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Log, track, and push harder
        </p>
      </div>

      {/* Primary CTA */}
      <div className="mb-10">
        <Link
          href="/workout/start"
          className="inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-[var(--gym-amber)] px-6 py-4 text-lg font-semibold text-[var(--chalk-white)] transition hover:bg-orange-600 active:scale-[0.98]"
        >
          Start workout
        </Link>
      </div>

      {/* Draft workout banner */}
      {draft ? (
        <div className="mb-10 rounded-lg border border-[var(--gym-amber)]/30 bg-[var(--gym-amber)]/5 p-4 dark:border-[var(--gym-amber)]/40 dark:bg-[var(--gym-amber)]/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gym-amber)] dark:text-orange-400">
            Draft in progress
          </p>
          <p className="mt-2 font-data text-lg font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            {draft.split}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/workout/${draft.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-4 py-2 font-semibold text-[var(--steel-gray)] transition hover:bg-[var(--gray-100)] dark:border-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--chalk-white)] dark:hover:bg-[var(--gray-700)]"
            >
              Continue
            </Link>
            <form action={discardDraft.bind(null, draft.id)}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--muted-red)]/40 bg-transparent px-4 py-2 font-semibold text-[var(--muted-red)] transition hover:bg-[var(--muted-red)]/5 dark:hover:bg-[var(--muted-red)]/10"
              >
                Discard
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Recent workouts section */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Last 7 days
        </h2>
        {recentByDate && recentByDate.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {recentByDate.map((workout) => (
              <li
                key={workout.id}
                className="rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] p-4 text-sm transition hover:border-[var(--gym-amber)]/50 dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)] dark:hover:border-[var(--gym-amber)]/30"
              >
                <Link href={`/history/${workout.id}`} className="block">
                  <span className="font-data font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                    {workout.split}
                  </span>
                  <span className="text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                    {" "}
                    · {workout.date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
            No completed workouts in the last 7 days. Start one to see your history here.
          </p>
        )}
      </section>
    </div>
  );
}
