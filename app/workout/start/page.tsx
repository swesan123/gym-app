import Link from "next/link";

import { createWorkoutDraftAndRedirect } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { SplitsMigrationBanner } from "@/components/SplitsMigrationBanner";
import { fetchSplitsCatalog } from "@/lib/queries/read";
import { hasSupabaseEnv } from "@/lib/env";

export default async function StartWorkoutPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const { splits: splitsForStart, splitsTableReady } = await fetchSplitsCatalog();

  return (
    <div className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center justify-center rounded-lg px-2 font-semibold text-[var(--gym-amber)] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-800)] transition-colors"
        >
          ← Back
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
          Choose split
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Pick a training split to start logging.
        </p>
      </div>

      {!splitsTableReady ? <SplitsMigrationBanner className="mt-4" /> : null}

      {splitsForStart.length === 0 ? (
        <div className="rounded-lg border border-[var(--gym-amber)]/30 bg-[var(--gym-amber)]/5 p-4 dark:border-[var(--gym-amber)]/40 dark:bg-[var(--gym-amber)]/10">
          <p className="text-sm font-semibold text-[var(--gym-amber)]">
            No splits defined yet
          </p>
          <p className="mt-2 text-sm text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Add split names (e.g. Upper A, Push day), then assign exercises to them.
          </p>
          <Link href="/settings/splits" className="mt-4 inline-block">
            <Button type="button" variant="secondary">
              Go to Splits
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {splitsForStart.map((s) => (
            <form
              key={s.id}
              action={createWorkoutDraftAndRedirect.bind(null, s.name)}
            >
              <Button type="submit" className="w-full py-4 text-lg">
                {s.name}
              </Button>
            </form>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
        Need another split?{" "}
        <Link href="/settings/splits" className="font-medium text-[var(--gym-amber)] underline hover:text-orange-600">
          Add one in Settings
        </Link>
      </p>
    </div>
  );
}
