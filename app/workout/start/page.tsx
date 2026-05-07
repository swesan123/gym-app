import Link from "next/link";

import { createWorkoutDraftAndRedirect } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { SPLITS } from "@/lib/constants";
import { hasSupabaseEnv } from "@/lib/env";

export default function StartWorkoutPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

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

      <div className="mt-6 flex flex-col gap-3">
        {SPLITS.map((split) => (
          <form
            key={split}
            action={createWorkoutDraftAndRedirect.bind(null, split)}
          >
            <Button type="submit" variant="secondary" className="w-full py-4">
              {split}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
