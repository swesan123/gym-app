"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createSplit, deleteSplit } from "@/app/actions/splits";
import type { WorkoutSplitRow } from "@/lib/queries/read";
import { SplitsMigrationBanner } from "@/components/SplitsMigrationBanner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function SplitSettingsClient({
  splits: initialSplits,
  splitsTableReady,
}: {
  splits: WorkoutSplitRow[];
  splitsTableReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    startTransition(async () => {
      try {
        setError(null);
        await createSplit(name);
        setNewName("");
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add split");
      }
    });
  };

  const onConfirmDelete = () => {
    const id = deleteId;
    if (!id) return;
    setDeleteId(null);
    startTransition(async () => {
      try {
        setError(null);
        await deleteSplit(id);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete");
      }
    });
  };

  return (
    <>
      <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/settings/exercises"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          >
            ← Exercises
          </Link>
        </div>
        <h1 className="mt-4 text-2xl font-bold">Splits</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Names listed here appear when you start a workout. Assign exercises to a split under{" "}
          <Link href="/settings/exercises" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Exercises
          </Link>
          .
        </p>

        {!splitsTableReady ? <SplitsMigrationBanner className="mt-4" /> : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={onAdd}
          className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            New split name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Push / Pull / Legs"
              disabled={!splitsTableReady || pending}
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <Button
            type="submit"
            disabled={pending || !newName.trim() || !splitsTableReady}
          >
            Add
          </Button>
        </form>

        <ul className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {initialSplits.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-3">
              <span className="font-medium">{s.name}</span>
              <Button
                type="button"
                variant="ghost"
                disabled={pending || !splitsTableReady}
                className="min-h-9 shrink-0 text-red-700 dark:text-red-400"
                onClick={() => setDeleteId(s.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>

        {initialSplits.length === 0 ? (
          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            No splits yet. Add one above.
          </p>
        ) : null}

        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Start logging from{" "}
          <Link href="/workout/start" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Start workout
          </Link>
          .
        </p>
      </div>

      <Modal
        open={!!deleteId}
        title="Delete split?"
        description="Only splits that are not used by any exercises or saved workouts can be removed."
        variant="danger"
        confirmLabel="Delete split"
        onCancel={() => setDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
