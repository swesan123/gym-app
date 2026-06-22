import type { SetType, StretchKind, TrackingType } from "@/lib/database.types";

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
  set_type: SetType;
};

export type SummaryExercise = {
  exercise_id: string;
  exercise_name: string;
  tracking_type: TrackingType;
  stretch_kind: StretchKind;
  /** Rest between sets (seconds); from exercise settings. */
  rest_seconds: number | null;
  sets: SummarySet[];
};

function formatVolume(v: number | null) {
  if (v == null) return "—";
  return Math.round(v).toLocaleString();
}

function ExerciseCard({ g }: { g: SummaryExercise }) {
  return (
    <section
      className="rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] p-4 dark:border-[var(--gray-100)] dark:bg-[var(--gray-50)]"
    >
      <h3 className="text-lg font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
        {g.exercise_name}
      </h3>
      <ul className="mt-3 space-y-3">
        {g.sets.map((s) => (
          <li
            key={s.id}
            className="rounded-lg bg-[var(--gray-50)] p-3 dark:bg-[var(--gray-100)]/80"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-[var(--steel-gray)] dark:text-[var(--gray-200)]">
                Set {s.set_number}
              </span>
              {g.tracking_type === "timed" ? (
                <span className="text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                  {s.duration_seconds != null
                    ? `${s.duration_seconds}s`
                    : "—"}
                </span>
              ) : (
                <>
                  <span className="text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                    Reps: {s.reps ?? "—"}
                  </span>
                  {(g.tracking_type === "weighted" ||
                    g.tracking_type === "assisted" ||
                    (g.tracking_type === "bodyweight" && s.weight != null)) && (
                    <span className="text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                      Wt: {s.weight ?? "—"}
                    </span>
                  )}
                </>
              )}
              {s.rir != null && (
                <span className="text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                  RIR {s.rir}
                </span>
              )}
              <span className="font-data text-[var(--gym-amber)]">
                Vol {formatVolume(s.volume)}
              </span>
            </div>
            {s.note ? (
              <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
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
              className="rounded-lg border border-[var(--gray-300)]/80 bg-[var(--gray-50)]/80 p-4 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]/50"
            >
              <h2 className="text-base font-bold uppercase tracking-wide text-[var(--gray-600)] dark:text-[var(--gray-400)]">
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
