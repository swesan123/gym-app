import Link from "next/link";

import { createWorkoutDraftAndRedirect } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { SplitsMigrationBanner } from "@/components/SplitsMigrationBanner";
import { UNASSIGNED_SPLIT_NAME } from "@/lib/constants";
import { fetchSplitsCatalog } from "@/lib/queries/read";
import { hasSupabaseEnv } from "@/lib/env";

export default async function StartWorkoutPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const { splits, splitsTableReady } = await fetchSplitsCatalog();
  const splitsForStart = splits.filter((s) => s.name !== UNASSIGNED_SPLIT_NAME);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-2 font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          ← Back
        </Link>
      </div>
      <h1 className="mt-4 text-2xl font-bold">Choose split</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Exercises and sets are created automatically.
      </p>

      {!splitsTableReady ? <SplitsMigrationBanner className="mt-4" /> : null}

      {splitsForStart.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            No splits defined yet.
          </p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            Add split names (e.g. Upper A, Push day), then assign exercises to them.
          </p>
          <Link href="/settings/splits" className="mt-4 inline-block">
            <Button type="button" variant="secondary">
              Go to Splits
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {splitsForStart.map((s) => (
            <form
              key={s.id}
              action={createWorkoutDraftAndRedirect.bind(null, s.name)}
            >
              <Button type="submit" variant="secondary" className="w-full py-4">
                {s.name}
              </Button>
            </form>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Need another split?{" "}
        <Link href="/settings/splits" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Add one in Settings
        </Link>
      </p>
    </div>
  );
}
