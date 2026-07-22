import Link from "next/link";

import { DraftWorkoutBanner } from "@/components/home/DraftWorkoutBanner";
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
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workouts")
        .select("id, split, date")
        .eq("status", "completed")
        .is("deleted_at", null)
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
        <DraftWorkoutBanner draftId={draft.id} splitName={draft.split} />
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
                className="rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] p-4 text-sm transition hover:border-[var(--gym-amber)]/50 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)] dark:hover:border-[var(--gym-amber)]/30"
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
