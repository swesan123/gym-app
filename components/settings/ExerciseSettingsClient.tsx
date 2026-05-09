"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createExercise,
  deleteExercise,
  reorderExercise,
  updateExercise,
} from "@/app/actions/exercises";
import { SplitsMigrationBanner } from "@/components/SplitsMigrationBanner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MUSCLES } from "@/lib/constants";
import type { Database, StretchKind, TrackingType } from "@/lib/database.types";
import type { WorkoutSplitRow } from "@/lib/queries/read";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

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

/** Empty or 0 → no percentage bump (stored as null). */
function parseOverloadPct(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  if (n === 0) return null;
  return n;
}

function parseStretchKind(raw: FormDataEntryValue | null): StretchKind {
  const v = String(raw ?? "none");
  if (v === "dynamic" || v === "static") return v;
  return "none";
}

type StretchCategoryKey = "dynamic" | "main" | "static";

function stretchCategory(stretch: StretchKind | null | undefined): StretchCategoryKey {
  if (stretch === "dynamic") return "dynamic";
  if (stretch === "static") return "static";
  return "main";
}

function peersInCategory(all: ExerciseRow[], ex: ExerciseRow): ExerciseRow[] {
  const cat = stretchCategory(ex.stretch_kind);
  return all
    .filter(
      (e) => e.split === ex.split && stretchCategory(e.stretch_kind) === cat,
    )
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        a.name.localeCompare(b.name),
    );
}

export function ExerciseSettingsClient({
  exercises,
  splits,
  splitsTableReady,
}: {
  exercises: ExerciseRow[];
  splits: WorkoutSplitRow[];
  splitsTableReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedSplits = useMemo(() => [...splits], [splits]);

  const sorted = useMemo(
    () =>
      [...exercises].sort((a, b) => {
        const splitCmp = a.split.localeCompare(b.split);
        if (splitCmp !== 0) return splitCmp;
        const ord = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (ord !== 0) return ord;
        return a.name.localeCompare(b.name);
      }),
    [exercises],
  );

  const splitOrder = useMemo(() => {
    const catalogNames = sortedSplits.map((s) => s.name);
    const present = new Set(exercises.map((ex) => ex.split));
    const ordered: string[] = [];
    for (const n of catalogNames) {
      if (present.has(n)) ordered.push(n);
    }
    const extra = [...present]
      .filter((n) => !ordered.includes(n))
      .sort((a, b) => a.localeCompare(b));
    return [...ordered, ...extra];
  }, [sortedSplits, exercises]);

  const categorySections: {
    key: StretchCategoryKey;
    title: string;
  }[] = [
    { key: "dynamic", title: "Dynamic stretches" },
    { key: "main", title: "Exercises" },
    { key: "static", title: "Static stretches" },
  ];

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
    const notes = String(fd.get("notes") ?? "").trim() || null;
    const machine_start_weight = parseNullableNumber(fd.get("machine_start_weight"));
    const machine_end_weight = parseNullableNumber(fd.get("machine_end_weight"));
    const machine_increment = parseNullableNumber(fd.get("machine_increment"));
    const default_reps = parseOptionalReps(fd.get("default_reps"));
    const progressive_overload_pct = parseOverloadPct(
      fd.get("progressive_overload_pct"),
    );
    const stretch_kind = parseStretchKind(fd.get("stretch_kind"));

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
          notes,
          machine_start_weight,
          machine_end_weight,
          machine_increment,
          default_reps,
          progressive_overload_pct,
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
    const split = String(fd.get("split") ?? "");
    const default_sets = Number(fd.get("default_sets"));
    const tracking_type = String(fd.get("tracking_type")) as TrackingType;
    const notes = String(fd.get("notes") ?? "").trim() || null;
    const machine_start_weight = parseNullableNumber(fd.get("machine_start_weight"));
    const machine_end_weight = parseNullableNumber(fd.get("machine_end_weight"));
    const machine_increment = parseNullableNumber(fd.get("machine_increment"));
    const default_reps = parseOptionalReps(fd.get("default_reps"));
    const progressive_overload_pct = parseOverloadPct(
      fd.get("progressive_overload_pct"),
    );
    const stretch_kind = parseStretchKind(fd.get("stretch_kind"));

    startTransition(async () => {
      try {
        setError(null);
        await createExercise({
          name,
          muscle,
          split,
          default_sets: Number.isFinite(default_sets) ? default_sets : 3,
          tracking_type,
          notes,
          machine_start_weight,
          machine_end_weight,
          machine_increment,
          default_reps,
          progressive_overload_pct,
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Exercises</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Edit moves used when you start a split.{" "}
              <Link
                href="/settings/splits"
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                Manage splits
              </Link>
              {" "}and{" "}
              <Link
                href="/settings/profile"
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                profile
              </Link>
              .
            </p>
          </div>
          <Button type="button" disabled={pending} onClick={() => setAdding(true)}>
            Add
          </Button>
        </div>

        {!splitsTableReady ? <SplitsMigrationBanner className="mt-4" /> : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-8">
          {splitOrder.map((splitName) => {
            const forSplit = sorted.filter((ex) => ex.split === splitName);
            if (forSplit.length === 0) return null;
            return (
              <section
                key={splitName}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-950/40"
              >
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {splitName}
                </h2>
                <div className="mt-4 flex flex-col gap-6">
                  {categorySections.map((sec) => {
                    const inCat = forSplit.filter(
                      (ex) => stretchCategory(ex.stretch_kind) === sec.key,
                    );
                    if (inCat.length === 0) return null;
                    return (
                      <div key={sec.key}>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {sec.title}
                        </h3>
                        <ul className="mt-3 flex flex-col gap-3">
                          {inCat.map((ex) => {
                            const peers = peersInCategory(exercises, ex);
                            const idx = peers.findIndex((e) => e.id === ex.id);
                            const disableUp = idx <= 0;
                            const disableDown = idx < 0 || idx >= peers.length - 1;
                            return (
                              <li
                                key={ex.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-semibold">{ex.name}</p>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                      {ex.muscle} · {ex.tracking_type} ·{" "}
                                      {ex.default_sets} sets
                                      {ex.stretch_kind &&
                                      ex.stretch_kind !== "none"
                                        ? ` · ${ex.stretch_kind} stretch`
                                        : ""}
                                    </p>
                                    {ex.notes ? (
                                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        {ex.notes}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 flex-col gap-2">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={pending || disableUp}
                                        className="min-h-9 min-w-9 px-0 text-base leading-none"
                                        aria-label={`Move ${ex.name} up in ${sec.title}`}
                                        onClick={() => {
                                          startTransition(async () => {
                                            try {
                                              setError(null);
                                              await reorderExercise(ex.id, "up");
                                              refresh();
                                            } catch (err) {
                                              setError(
                                                err instanceof Error
                                                  ? err.message
                                                  : "Reorder failed",
                                              );
                                            }
                                          });
                                        }}
                                      >
                                        ↑
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={pending || disableDown}
                                        className="min-h-9 min-w-9 px-0 text-base leading-none"
                                        aria-label={`Move ${ex.name} down in ${sec.title}`}
                                        onClick={() => {
                                          startTransition(async () => {
                                            try {
                                              setError(null);
                                              await reorderExercise(
                                                ex.id,
                                                "down",
                                              );
                                              refresh();
                                            } catch (err) {
                                              setError(
                                                err instanceof Error
                                                  ? err.message
                                                  : "Reorder failed",
                                              );
                                            }
                                          });
                                        }}
                                      >
                                        ↓
                                      </Button>
                                    </div>
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
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
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
              <select
                name="muscle"
                required
                defaultValue={editing.muscle}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              >
                {muscleOptions(editing.muscle).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Split
              {splitsTableReady ? (
                <select
                  name="split"
                  required
                  defaultValue={editing.split}
                  className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
                >
                  {!sortedSplits.some((s) => s.name === editing.split) ? (
                    <option value={editing.split}>{editing.split}</option>
                  ) : null}
                  {sortedSplits.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    name="split"
                    list="edit-split-suggestions"
                    required
                    defaultValue={editing.split}
                    className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
                  />
                  <datalist id="edit-split-suggestions">
                    {sortedSplits.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </>
              )}
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
              Default reps (optional)
              <input
                name="default_reps"
                type="number"
                min={1}
                max={50}
                placeholder="Prefill new sets"
                defaultValue={editing.default_reps ?? ""}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Progressive overload % (optional)
              <input
                name="progressive_overload_pct"
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="0 = off"
                defaultValue={
                  editing.progressive_overload_pct != null
                    ? String(editing.progressive_overload_pct)
                    : ""
                }
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Stretch section
              <select
                name="stretch_kind"
                required
                defaultValue={editing.stretch_kind ?? "none"}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              >
                <option value="none">Main</option>
                <option value="dynamic">Dynamic stretch</option>
                <option value="static">Static stretch</option>
              </select>
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
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Exercise notes
              <textarea
                name="notes"
                rows={3}
                defaultValue={editing.notes ?? ""}
                placeholder="Machine settings, setup cues, or reminders"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Machine start
                <input
                  name="machine_start_weight"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  defaultValue={editing.machine_start_weight ?? ""}
                  className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Machine end
                <input
                  name="machine_end_weight"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  defaultValue={editing.machine_end_weight ?? ""}
                  className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Machine increment
                <input
                  name="machine_increment"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  defaultValue={editing.machine_increment ?? ""}
                  className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
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
            <select
              name="muscle"
              required
              defaultValue={MUSCLES[0]}
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            >
              {MUSCLES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Split
            {splitsTableReady ? (
              <select
                name="split"
                required
                defaultValue={sortedSplits[0]?.name ?? ""}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              >
                {sortedSplits.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  name="split"
                  list="add-split-suggestions"
                  required
                  placeholder={
                    sortedSplits[0]?.name ?? "e.g. Push day"
                  }
                  defaultValue={sortedSplits[0]?.name ?? ""}
                  className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
                />
                <datalist id="add-split-suggestions">
                  {sortedSplits.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </>
            )}
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
            Default reps (optional)
            <input
              name="default_reps"
              type="number"
              min={1}
              max={50}
              placeholder="Prefill new sets"
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Progressive overload % (optional)
            <input
              name="progressive_overload_pct"
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="0 = off"
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Stretch section
            <select
              name="stretch_kind"
              required
              defaultValue="none"
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="none">Main</option>
              <option value="dynamic">Dynamic stretch</option>
              <option value="static">Static stretch</option>
            </select>
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
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Exercise notes
            <textarea
              name="notes"
              rows={3}
              placeholder="Machine settings, setup cues, or reminders"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Machine start
              <input
                name="machine_start_weight"
                type="number"
                inputMode="decimal"
                step="any"
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Machine end
              <input
                name="machine_end_weight"
                type="number"
                inputMode="decimal"
                step="any"
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Machine increment
              <input
                name="machine_increment"
                type="number"
                inputMode="decimal"
                step="any"
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
          </div>
          {sortedSplits.length === 0 ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {splitsTableReady ? (
                <>
                  Add a split under{" "}
                  <Link href="/settings/splits" className="underline">
                    Settings → Splits
                  </Link>{" "}
                  first.
                </>
              ) : (
                <>
                  Enter a split name above (suggestions appear after you have exercises).
                  After running the database migration, you can manage splits under{" "}
                  <Link href="/settings/splits" className="underline">
                    Settings → Splits
                  </Link>
                  .
                </>
              )}
            </p>
          ) : null}
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
