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

  const { body_weight } = await fetchTrainingProfile();

  return (
    <div className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link
        href="/settings/exercises"
        className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--gym-amber)] hover:text-orange-600"
      >
        ← Exercises
      </Link>

      <div className="mt-6 mb-8">
        <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
          Training profile
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Body weight is used to calculate volume for bodyweight and assisted movements.
        </p>
      </div>

      <form action={saveTrainingProfile} className="space-y-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
          Body weight (kg/lbs)
          <input
            name="body_weight"
            type="number"
            inputMode="decimal"
            step="any"
            defaultValue={body_weight ?? ""}
            placeholder="e.g. 175"
            className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]"
          />
        </label>
        <p className="text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Leave blank to disable bodyweight-based volume calculations.
        </p>
        <Button type="submit" className="mt-6">
          Save profile
        </Button>
      </form>

      <div className="mt-10 border-t border-[var(--gray-200)] pt-6 dark:border-[var(--gray-100)]">
        <p className="text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Want to export or back up your data?{" "}
          <Link
            href="/settings/backup"
            className="text-[var(--gym-amber)] underline hover:text-orange-600"
          >
            Backup your data →
          </Link>
        </p>
      </div>
    </div>
  );
}
