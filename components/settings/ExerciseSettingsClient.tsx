"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createExercise, deleteExercise, updateExercise } from "@/app/actions/exercises";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Database, TrackingType } from "@/lib/database.types";
import { SPLITS } from "@/lib/constants";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

const TRACKING: TrackingType[] = [
  "weighted",
  "assisted",
  "bodyweight",
  "timed",
];

export function ExerciseSettingsClient({
  exercises,
}: {
  exercises: ExerciseRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...exercises].sort((a, b) =>
        `${a.split} ${a.name}`.localeCompare(`${b.split} ${b.name}`),
      ),
    [exercises],
  );

  const refresh = () => router.refresh();

  const onSaveEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const muscle = String(fd.get("muscle") ?? "");
    const split = String(fd.get("split") ?? "");
    const default_sets = Number(fd.get("default_sets"));
    const tracking_type = String(fd.get("tracking_type")) as TrackingType;

    startTransition(async () => {
      try {
        setError(null);
        await updateExercise({
          id: editing.id,
          name,
          muscle,
          split,
          default_sets: Number.isFinite(default_sets) ? default_sets : 3,
          tracking_type,
        });
        setEditing(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  const onSaveAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const muscle = String(fd.get("muscle") ?? "");
    const workout_type = String(fd.get("workout_type") ?? "");
    const split = String(fd.get("split") ?? "");
    const default_sets = Number(fd.get("default_sets"));
    const tracking_type = String(fd.get("tracking_type")) as TrackingType;

    startTransition(async () => {
      try {
        setError(null);
        await createExercise({
          name,
          muscle,
          workout_type,
          split,
          default_sets: Number.isFinite(default_sets) ? default_sets : 3,
          tracking_type,
        });
        setAdding(false);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    });
  };

  return (
    <>
      <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Exercises</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Edit metadata used for new workouts.
            </p>
          </div>
          <Button type="button" disabled={pending} onClick={() => setAdding(true)}>
            Add
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </p>
        ) : null}

        <ul className="mt-6 flex flex-col gap-3">
          {sorted.map((ex) => (
            <li
              key={ex.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{ex.name}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {ex.split} · {ex.muscle} · {ex.tracking_type} ·{" "}
                    {ex.default_sets} sets
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    className="min-h-10 px-3 py-2 text-sm"
                    onClick={() => setEditing(ex)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    className="min-h-10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
                    onClick={() => setDeleteId(ex.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={!!editing}
        title="Edit exercise"
        cancelLabel="Close"
        confirmLabel="Save"
        onCancel={() => setEditing(null)}
        onConfirm={() => {
          const form = document.getElementById(
            "edit-exercise-form",
          ) as HTMLFormElement | null;
          form?.requestSubmit();
        }}
      >
        {editing ? (
          <form id="edit-exercise-form" className="space-y-3" onSubmit={onSaveEdit}>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Name
              <input
                name="name"
                required
                defaultValue={editing.name}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Muscle
              <input
                name="muscle"
                required
                defaultValue={editing.muscle}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Split
              <input
                name="split"
                required
                defaultValue={editing.split}
                list="split-presets"
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
              <datalist id="split-presets">
                {SPLITS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Default sets
              <input
                name="default_sets"
                type="number"
                min={1}
                max={20}
                required
                defaultValue={editing.default_sets}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Tracking type
              <select
                name="tracking_type"
                required
                defaultValue={editing.tracking_type}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              >
                {TRACKING.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={adding}
        title="Add exercise"
        cancelLabel="Cancel"
        confirmLabel="Create"
        onCancel={() => setAdding(false)}
        onConfirm={() => {
          const form = document.getElementById(
            "add-exercise-form",
          ) as HTMLFormElement | null;
          form?.requestSubmit();
        }}
      >
        <form id="add-exercise-form" className="space-y-3" onSubmit={onSaveAdd}>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Name
            <input
              name="name"
              required
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Muscle
            <input name="muscle" required className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Workout type
            <select
              name="workout_type"
              required
              defaultValue="Upper"
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="Upper">Upper</option>
              <option value="Lower">Lower</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Split
            <input
              name="split"
              required
              list="split-presets-add"
              placeholder="Upper A"
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
            <datalist id="split-presets-add">
              {SPLITS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Default sets
            <input
              name="default_sets"
              type="number"
              min={1}
              max={20}
              required
              defaultValue={3}
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Tracking type
            <select
              name="tracking_type"
              required
              defaultValue="weighted"
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            >
              {TRACKING.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        title="Delete exercise?"
        description="Only allowed when no workout sets reference this exercise."
        variant="danger"
        confirmLabel="Delete exercise"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          const id = deleteId;
          if (!id) return;
          setDeleteId(null);
          startTransition(async () => {
            try {
              setError(null);
              await deleteExercise(id);
              refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Delete failed");
            }
          });
        }}
      />
    </>
  );
}
