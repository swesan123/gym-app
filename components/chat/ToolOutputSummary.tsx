import Link from "next/link";

import type { PersonalRecord, RecordEntry, ReturnPlanExercise } from "@/lib/ai/contracts";
import { formatGap } from "@/lib/loadAdjustment";

import { mutedTextClass, primaryTextClass } from "./styles";
import type { ReadToolPart } from "./types";

type ReadToolOutputPart = Extract<ReadToolPart, { state: "output-available" }>;

const formatEntry = (entry: RecordEntry | null): string => {
  if (!entry) return "—";
  if (entry.weight != null && entry.reps != null) return `${entry.weight} × ${entry.reps}`;
  return String(entry.value);
};

const formatNumber = (value: number | null): string => (value == null ? "—" : String(value));

const EmptyNote = ({ children }: { children: string }) => (
  <p className={`text-sm ${mutedTextClass}`}>{children}</p>
);

const DataTable = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <div className="max-h-64 overflow-auto">
    <table className="w-full text-left text-xs">
      <thead>
        <tr className={mutedTextClass}>
          {headers.map((header) => (
            <th key={header} scope="col" className="whitespace-nowrap py-1 pr-3 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="font-data tabular-nums">
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-t border-[var(--gray-200)]">
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className={`py-1 pr-3 ${cellIndex === 0 ? `font-sans font-medium ${primaryTextClass}` : ""}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const recordRow = (record: PersonalRecord): string[] => [
  record.exercise,
  formatEntry(record.heaviestWeight),
  record.bestE1rm ? String(record.bestE1rm.value) : "—",
  record.mostReps ? String(record.mostReps.value) : "—",
  record.bestSetVolume ? String(record.bestSetVolume.value) : "—",
];

const describeReturnAdjustment = (exercise: ReturnPlanExercise): string => {
  switch (exercise.phase) {
    case null:
      return "Normal";
    case "hold":
      return "Hold weight";
    case "first-session":
      return [`−${exercise.cutPct}%`, exercise.dropOneSet ? "one fewer set" : null].filter(Boolean).join(" · ");
    case "ramp":
      if (exercise.cutPct === 0) return "Back to pre-break weight";
      return `−${exercise.cutPct}% · stepping back up`;
    default: {
      const exhaustive: never = exercise.phase;
      return exhaustive;
    }
  }
};

export function ToolOutputSummary({ part }: { part: ReadToolOutputPart }) {
  switch (part.type) {
    case "tool-listSplits":
      if (part.output.splits.length === 0) return <EmptyNote>No splits yet.</EmptyNote>;
      return <p className={`text-sm ${primaryTextClass}`}>{part.output.splits.join(", ")}</p>;

    case "tool-listExercises":
      if (part.output.exercises.length === 0) return <EmptyNote>No matching exercises.</EmptyNote>;
      return (
        <DataTable
          headers={["Exercise", "Muscle", "Splits"]}
          rows={part.output.exercises.map((e) => [e.name, e.muscle, e.splits.join(", ") || "—"])}
        />
      );

    case "tool-getRecentWorkouts":
      if (part.output.workouts.length === 0) return <EmptyNote>No workouts yet.</EmptyNote>;
      return (
        <ul className="space-y-1 text-sm">
          {part.output.workouts.map((w) => (
            <li key={w.id}>
              <Link href={w.url} className={`font-medium underline-offset-2 hover:underline ${primaryTextClass}`}>
                {w.split}
              </Link>{" "}
              <span className={`font-data tabular-nums ${mutedTextClass}`}>
                {w.date} · {w.status} · {w.workingSetsDone} sets
                {w.totalVolume != null ? ` · ${Math.round(w.totalVolume)} vol` : ""}
              </span>
            </li>
          ))}
        </ul>
      );

    case "tool-getExerciseProgress":
      if ("error" in part.output) return <EmptyNote>{part.output.error}</EmptyNote>;
      if (part.output.weeks.length === 0) return <EmptyNote>No data in this range.</EmptyNote>;
      return (
        <DataTable
          headers={["Week", "Weight", "Reps", "e1RM"]}
          rows={part.output.weeks.map((w) => [
            w.week,
            formatNumber(w.bestWeight),
            formatNumber(w.bestReps),
            formatNumber(w.bestE1rm),
          ])}
        />
      );

    case "tool-getPersonalRecords":
      if ("error" in part.output) return <EmptyNote>{part.output.error}</EmptyNote>;
      if (part.output.records.length === 0) return <EmptyNote>No records yet.</EmptyNote>;
      return (
        <DataTable
          headers={["Exercise", "Heaviest", "e1RM", "Reps", "Set vol"]}
          rows={part.output.records.map(recordRow)}
        />
      );

    case "tool-getTrainingProfile":
      return (
        <p className={`text-sm ${primaryTextClass}`}>
          Body weight:{" "}
          <span className="font-data tabular-nums">
            {part.output.bodyWeight != null ? part.output.bodyWeight : "not set"}
          </span>
        </p>
      );

    case "tool-getActiveDraft":
      if (!part.output.draft) return <EmptyNote>No workout in progress.</EmptyNote>;
      return (
        <p className="text-sm">
          <Link
            href={part.output.draft.url}
            className={`font-medium underline-offset-2 hover:underline ${primaryTextClass}`}
          >
            {part.output.draft.split}
          </Link>{" "}
          <span className={`font-data tabular-nums ${mutedTextClass}`}>
            {part.output.draft.date} · {part.output.draft.workingSetsDone}/{part.output.draft.workingSetsTotal} sets
          </span>
        </p>
      );

    case "tool-getReturnPlan":
      if ("error" in part.output) return <EmptyNote>{part.output.error}</EmptyNote>;
      return (
        <div className="space-y-2">
          {part.output.daysSinceLastWorkout != null && (
            <p className={`text-sm ${primaryTextClass}`}>
              {formatGap(part.output.daysSinceLastWorkout)} since your last workout
            </p>
          )}
          {part.output.exercises.length === 0 ? (
            <EmptyNote>No exercises in this split.</EmptyNote>
          ) : (
            <ul className="space-y-1 text-sm">
              {part.output.exercises.map((exercise) => (
                <li key={exercise.exercise}>
                  <span className={`font-medium ${primaryTextClass}`}>{exercise.exercise}</span>{" "}
                  <span className={`font-data tabular-nums ${mutedTextClass}`}>
                    {describeReturnAdjustment(exercise)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    default: {
      const exhaustive: never = part;
      return exhaustive;
    }
  }
}
