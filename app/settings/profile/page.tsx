import Link from "next/link";

import { saveTrainingProfile } from "@/app/actions/profile";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/env";
import { fetchTrainingProfile } from "@/lib/queries/read";

export default async function ProfileSettingsPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const { body_weight, progression_base_pct } = await fetchTrainingProfile();

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <Link
          href="/settings/exercises"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 dark:text-emerald-400"
        >
          ← Exercises
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-bold">Training profile</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Body weight is used to calculate volume for bodyweight and assisted
        movements. Progression base % is optional: when set, it overrides each
        exercise&apos;s overload % when auto-filling weights from history, and
        scales with RIR (more reps in reserve → larger step).
      </p>

      <form action={saveTrainingProfile} className="mt-6 space-y-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Body weight
          <input
            name="body_weight"
            type="number"
            inputMode="decimal"
            step="any"
            defaultValue={body_weight ?? ""}
            placeholder="e.g. 175"
            className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Leave blank to disable bodyweight-based volume math.
        </p>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Progression base % (optional)
          <input
            name="progression_base_pct"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            defaultValue={progression_base_pct ?? ""}
            placeholder="Uses each exercise’s overload % when blank"
            className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
        <Button type="submit">Save profile</Button>
      </form>
    </div>
  );
}
