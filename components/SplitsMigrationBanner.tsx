/** Shown when `workout_splits` migration has not been applied yet. */
export function SplitsMigrationBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100 ${className}`}
      role="status"
    >
      <p className="font-semibold">Database update needed</p>
      <p className="mt-1 text-amber-900 dark:text-amber-200">
        Run the migration{" "}
        <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900">
          supabase/migrations/20250508120000_splits_catalog_drop_workout_type.sql
        </code>{" "}
        in the Supabase SQL Editor (paste the file contents, then Run). Until then,
        splits are inferred from your exercises only—custom split management is
        limited.
      </p>
    </div>
  );
}
