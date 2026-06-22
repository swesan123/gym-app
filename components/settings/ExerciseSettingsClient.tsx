"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createExercise,
  deleteExercise,
  updateExercise,
} from "@/app/actions/exercises";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MUSCLES } from "@/lib/constants";
import type { Database, StretchKind, TrackingType } from "@/lib/database.types";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

type ExerciseWithSplits = ExerciseRow & {
  exercise_splits: Array<{ split_name: string; sort_order: number }>;
};

const TRACKING: TrackingType[] = [
  "weighted",
  "assisted",
  "bodyweight",
  "timed",
];

function muscleOptions(current?: string | null): string[] {
  const s = new Set<string>(MUSCLES as unknown as string[]);
  if (current?.trim()) s.add(current.trim());
  return [...s].sort((a, b) => a.localeCompare(b));
}

function parseNullableNumber(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseOptionalReps(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < 1 || r > 50) return null;
  return r;
}

function parseOverloadIncrement(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null;
  return n;
}

function parseRestSeconds(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0 || n > 3600) return null;
  if (n === 0) return null;
  return n;
}

function parseStretchKind(raw: FormDataEntryValue | null): StretchKind {
  const v = String(raw ?? "none");
  if (v === "dynamic" || v === "static") return v;
  return "none";
}


export function ExerciseSettingsClient({
  exercises,
}: {
  exercises: ExerciseWithSplits[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<ExerciseWithSplits | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const q = searchQuery.toLowerCase();
    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.muscle.toLowerCase().includes(q) ||
        (ex.notes?.toLowerCase().includes(q) ?? false)
    );
  }, [exercises, searchQuery]);

  const groupedByCategory = useMemo(() => {
    return {
      dynamic: filteredExercises.filter((ex) => ex.stretch_kind === "dynamic").sort((a, b) => a.name.localeCompare(b.name)),
      main: filteredExercises.filter((ex) => ex.stretch_kind === "none").sort((a, b) => a.name.localeCompare(b.name)),
      static: filteredExercises.filter((ex) => ex.stretch_kind === "static").sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [filteredExercises]);

  const refresh = () => router.refresh();

  const onSaveEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const muscle = String(fd.get("muscle") ?? "");
    const default_sets = Number(fd.get("default_sets"));
    const tracking_type = String(fd.get("tracking_type")) as TrackingType;
    const notes = String(fd.get("notes") ?? "").trim() || null;
    const machine_start_weight = parseNullableNumber(fd.get("machine_start_weight"));
    const machine_end_weight = parseNullableNumber(fd.get("machine_end_weight"));
    const machine_increment = parseNullableNumber(fd.get("machine_increment"));
    const default_reps = parseOptionalReps(fd.get("default_reps"));
    const progressive_overload_increment = parseOverloadIncrement(
      fd.get("progressive_overload_increment"),
    );
    const rest_seconds = parseRestSeconds(fd.get("rest_seconds"));
    const stretch_kind = parseStretchKind(fd.get("stretch_kind"));

    startTransition(async () => {
      try {
        setError(null);
        await updateExercise({
          id: editing.id,
          name,
          muscle,
          splits: (editing.exercise_splits ?? []).map((es) => es.split_name),
          default_sets: Number.isFinite(default_sets) ? default_sets : 3,
          tracking_type,
          notes,
          machine_start_weight,
          machine_end_weight,
          machine_increment,
          default_reps,
          progressive_overload_increment,
          rest_seconds,
          stretch_kind,
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
    const default_sets = Number(fd.get("default_sets"));
    const tracking_type = String(fd.get("tracking_type")) as TrackingType;
    const notes = String(fd.get("notes") ?? "").trim() || null;
    const machine_start_weight = parseNullableNumber(fd.get("machine_start_weight"));
    const machine_end_weight = parseNullableNumber(fd.get("machine_end_weight"));
    const machine_increment = parseNullableNumber(fd.get("machine_increment"));
    const default_reps = parseOptionalReps(fd.get("default_reps"));
    const progressive_overload_increment = parseOverloadIncrement(
      fd.get("progressive_overload_increment"),
    );
    const rest_seconds = parseRestSeconds(fd.get("rest_seconds"));
    const stretch_kind = parseStretchKind(fd.get("stretch_kind"));

    startTransition(async () => {
      try {
        setError(null);
        await createExercise({
          name,
          muscle,
          splits: [],
          default_sets: Number.isFinite(default_sets) ? default_sets : 3,
          tracking_type,
          notes,
          machine_start_weight,
          machine_end_weight,
          machine_increment,
          default_reps,
          progressive_overload_increment,
          rest_seconds,
          stretch_kind,
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
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
                Exercises
              </h1>
              <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                Manage exercise properties. Assign exercises to splits under{" "}
                <Link
                  href="/settings/splits"
                  className="font-medium text-[var(--gym-amber)] underline"
                >
                  Splits
                </Link>
                . Set training defaults,{" "}
                <Link
                  href="/settings/profile"
                  className="font-medium text-[var(--gym-amber)] underline"
                >
                  profile
                </Link>
                , or{" "}
                <Link
                  href="/settings/backup"
                  className="font-medium text-[var(--gym-amber)] underline"
                >
                  backup
                </Link>
                .
              </p>
            </div>
            <Button
              type="button"
              disabled={pending}
              onClick={() => setAdding(true)}
            >
              Add
            </Button>
          </div>

          <input
            type="text"
            placeholder="Search by name, muscle, or notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-4 py-2 text-sm text-[var(--steel-gray)] placeholder-[var(--gray-500)] focus:border-[var(--gym-amber)] focus:outline-none focus:ring-2 focus:ring-[var(--gym-amber)]/20 dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)] dark:text-[var(--chalk-white)] dark:placeholder-[var(--gray-400)]"
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-6">
          {filteredExercises.length === 0 && searchQuery ? (
            <p className="text-center text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
              No exercises match &ldquo;{searchQuery}&rdquo;
            </p>
          ) : null}
          {Object.entries(groupedByCategory).map(([key, exList]) => {
            if (exList.length === 0) return null;
            const titles: Record<string, string> = {
              dynamic: "Dynamic stretches",
              main: "Exercises",
              static: "Static stretches",
            };
            return (
              <div key={key} className="rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] p-4 dark:border-[var(--gray-700)] dark:bg-[var(--gray-950)]/40">
                <h2 className="text-lg font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                  {titles[key] || key}
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {exList.map((ex) => (
                    <li
                      key={ex.id}
                      className="rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] p-3 dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                            {ex.name}
                          </p>
                          <p className="text-sm text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                            {ex.muscle} · {ex.tracking_type} · {ex.default_sets} sets
                          </p>
                          {ex.notes ? (
                            <p className="mt-1 text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                              {ex.notes}
                            </p>
                          ) : null}
                          {ex.exercise_splits.length > 0 ? (
                            <p className="mt-1 text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                              In: {ex.exercise_splits.map((es) => es.split_name).join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
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
                            className="min-h-10 px-3 py-2 text-sm text-[var(--muted-red)] dark:text-red-400"
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
            );
          })}
        </div>
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
          <form key={editing.id} id="edit-exercise-form" className="space-y-3" onSubmit={onSaveEdit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Name
              <input
                name="name"
                required
                defaultValue={editing.name}
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Muscle
              <select
                name="muscle"
                required
                defaultValue={editing.muscle}
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              >
                {muscleOptions(editing.muscle).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Default sets
              <input
                name="default_sets"
                type="number"
                min={1}
                max={20}
                required
                defaultValue={editing.default_sets}
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Default reps
              <input
                name="default_reps"
                type="number"
                min={1}
                max={50}
                placeholder="Prefill new sets"
                defaultValue={editing.default_reps ?? ""}
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Increment (lb/kg)
              <input
                name="progressive_overload_increment"
                type="number"
                min={0}
                max={1000}
                step={0.5}
                inputMode="decimal"
                placeholder="Fixed weight increase per set"
                defaultValue={
                  editing.progressive_overload_increment != null
                    ? String(editing.progressive_overload_increment)
                    : ""
                }
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Rest between sets (seconds)
              <input
                name="rest_seconds"
                type="number"
                min={0}
                max={3600}
                step={5}
                placeholder="Optional timer after logging a set"
                defaultValue={
                  editing.rest_seconds != null
                    ? String(editing.rest_seconds)
                    : ""
                }
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Stretch section
              <select
                name="stretch_kind"
                required
                defaultValue={editing.stretch_kind ?? "none"}
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              >
                <option value="none">Main</option>
                <option value="dynamic">Dynamic stretch</option>
                <option value="static">Static stretch</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Tracking type
              <select
                name="tracking_type"
                required
                defaultValue={editing.tracking_type}
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              >
                {TRACKING.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Exercise notes
              <textarea
                name="notes"
                rows={3}
                defaultValue={editing.notes ?? ""}
                placeholder="Machine settings, setup cues, or reminders"
                className="rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 py-2 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                Machine start
                <input
                  name="machine_start_weight"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  defaultValue={editing.machine_start_weight ?? ""}
                  className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                Machine end
                <input
                  name="machine_end_weight"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  defaultValue={editing.machine_end_weight ?? ""}
                  className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
                Machine increment
                <input
                  name="machine_increment"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  defaultValue={editing.machine_increment ?? ""}
                  className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
                />
              </label>
            </div>
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
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Name
            <input
              name="name"
              required
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Muscle
            <select
              name="muscle"
              required
              defaultValue={MUSCLES[0]}
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            >
              {MUSCLES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Default sets
            <input
              name="default_sets"
              type="number"
              min={1}
              max={20}
              required
              defaultValue={3}
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Default reps
            <input
              name="default_reps"
              type="number"
              min={1}
              max={50}
              placeholder="Prefill new sets"
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Increment (lb/kg)
            <input
              name="progressive_overload_increment"
              type="number"
              min={0}
              max={1000}
              step={0.5}
              inputMode="decimal"
              placeholder="Fixed weight increase per set"
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Rest between sets (seconds)
            <input
              name="rest_seconds"
              type="number"
              min={0}
              max={3600}
              step={5}
              placeholder="Optional timer after logging a set"
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Stretch section
            <select
              name="stretch_kind"
              required
              defaultValue="none"
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            >
              <option value="none">Main</option>
              <option value="dynamic">Dynamic stretch</option>
              <option value="static">Static stretch</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Tracking type
            <select
              name="tracking_type"
              required
              defaultValue="weighted"
              className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
            >
              {TRACKING.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Exercise notes
            <textarea
              name="notes"
              rows={3}
              placeholder="Machine settings, setup cues, or reminders"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Machine start
              <input
                name="machine_start_weight"
                type="number"
                inputMode="decimal"
                step="any"
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Machine end
              <input
                name="machine_end_weight"
                type="number"
                inputMode="decimal"
                step="any"
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Machine increment
              <input
                name="machine_increment"
                type="number"
                inputMode="decimal"
                step="any"
                className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-700)] dark:bg-[var(--gray-900)]"
              />
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        title="Delete exercise?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          const id = deleteId;
          startTransition(async () => {
            try {
              setError(null);
              await deleteExercise(id);
              setDeleteId(null);
              refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Delete failed");
            }
          });
        }}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Deleting an exercise will also delete all logged sets for it. This cannot
          be undone.
        </p>
      </Modal>
    </>
  );
}
