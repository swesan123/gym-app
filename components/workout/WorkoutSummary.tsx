import type { StretchKind, TrackingType } from "@/lib/database.types";

import { partitionGroupsByStretchKind } from "@/components/workout/partitionGroupsByStretchKind";

export type SummarySet = {
  id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  duration_seconds: number | null;
  volume: number | null;
  note: string | null;
};

export type SummaryExercise = {
  exercise_id: string;
  exercise_name: string;
  tracking_type: TrackingType;
  stretch_kind: StretchKind;
  sets: SummarySet[];
};

function formatVolume(v: number | null) {
  if (v == null) return "—";
  return Math.round(v).toLocaleString();
}

function ExerciseCard({ g }: { g: SummaryExercise }) {
  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        {g.exercise_name}
      </h3>
      <ul className="mt-3 space-y-3">
        {g.sets.map((s) => (
          <li
            key={s.id}
            className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/80"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                Set {s.set_number}
              </span>
              {g.tracking_type === "timed" ? (
                <span className="text-zinc-600 dark:text-zinc-400">
                  {s.duration_seconds != null
                    ? `${s.duration_seconds}s`
                    : "—"}
                </span>
              ) : (
                <>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Reps: {s.reps ?? "—"}
                  </span>
                  {(g.tracking_type === "weighted" ||
                    g.tracking_type === "assisted" ||
                    (g.tracking_type === "bodyweight" && s.weight != null)) && (
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Wt: {s.weight ?? "—"}
                    </span>
                  )}
                </>
              )}
              {s.rir != null && (
                <span className="text-zinc-600 dark:text-zinc-400">
                  RIR {s.rir}
                </span>
              )}
              <span className="text-zinc-600 dark:text-zinc-400">
                Vol {formatVolume(s.volume)}
              </span>
            </div>
            {s.note ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {s.note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorkoutSummary({ groups }: { groups: SummaryExercise[] }) {
  const sections = partitionGroupsByStretchKind(groups);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 pb-28 pt-4">
      {sections.map(
        (sec) =>
          sec.groups.length > 0 && (
            <section
              key={sec.key}
              className="rounded-2xl border border-zinc-300/80 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
            >
              <h2 className="text-base font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                {sec.title}
              </h2>
              <div className="mt-4 flex flex-col gap-4">
                {sec.groups.map((g) => (
                  <ExerciseCard key={g.exercise_id} g={g} />
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  );
}
