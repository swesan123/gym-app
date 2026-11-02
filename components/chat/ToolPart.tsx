import type { ReactNode } from "react";

import type { ReadToolName } from "@/lib/ai/contracts";

import { mutedTextClass } from "./styles";
import { ToolOutputSummary } from "./ToolOutputSummary";
import type { ReadToolPart } from "./types";

type ToolLabels = { running: string; done: string; failed: string };

const TOOL_LABELS: Record<ReadToolName, ToolLabels> = {
  listSplits: { running: "Looking up splits…", done: "Checked your splits", failed: "Couldn't check your splits" },
  listExercises: {
    running: "Looking up exercises…",
    done: "Checked your exercises",
    failed: "Couldn't check your exercises",
  },
  getRecentWorkouts: {
    running: "Reviewing recent workouts…",
    done: "Reviewed recent workouts",
    failed: "Couldn't review recent workouts",
  },
  getExerciseProgress: {
    running: "Analyzing exercise progress…",
    done: "Analyzed exercise progress",
    failed: "Couldn't analyze exercise progress",
  },
  getPersonalRecords: {
    running: "Looking up personal records…",
    done: "Checked personal records",
    failed: "Couldn't check personal records",
  },
  getTrainingProfile: {
    running: "Checking your profile…",
    done: "Checked your profile",
    failed: "Couldn't check your profile",
  },
  getActiveDraft: {
    running: "Checking for a workout in progress…",
    done: "Checked for a workout in progress",
    failed: "Couldn't check for a workout in progress",
  },
  getReturnPlan: {
    running: "Checking time off…",
    done: "Checked time off",
    failed: "Couldn't check time off",
  },
};

const chipClass =
  "inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] px-3 py-1 text-xs font-medium dark:bg-[var(--gray-100)]";

const getToolName = (type: ReadToolPart["type"]): ReadToolName => type.slice("tool-".length) as ReadToolName;

const getOutputError = (output: unknown): string | null => {
  if (typeof output !== "object" || output === null || !("error" in output)) return null;
  return typeof output.error === "string" ? output.error : "Unknown error";
};

const Chip = ({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "error" }) => (
  <p
    className={`${chipClass} ${
      tone === "error" ? "text-[var(--muted-red)] dark:text-red-300" : mutedTextClass
    }`}
  >
    {children}
  </p>
);

export function ToolPart({ part }: { part: ReadToolPart }) {
  const labels = TOOL_LABELS[getToolName(part.type)];

  switch (part.state) {
    case "input-streaming":
    case "input-available":
    case "approval-requested":
    case "approval-responded":
      return (
        <Chip>
          <span
            aria-hidden="true"
            className="size-2 shrink-0 animate-pulse rounded-full bg-[var(--gym-amber)]"
          />
          {labels.running}
        </Chip>
      );

    case "output-available": {
      const error = getOutputError(part.output);
      if (error) {
        return (
          <Chip tone="error">
            {labels.failed}: {error}
          </Chip>
        );
      }
      return (
        <details className="group w-fit max-w-full">
          <summary
            className={`${chipClass} ${mutedTextClass} cursor-pointer list-none hover:bg-[var(--gray-100)] [&::-webkit-details-marker]:hidden`}
          >
            <span aria-hidden="true">✓</span>
            {labels.done}
            <span aria-hidden="true" className="transition group-open:rotate-90">
              ›
            </span>
          </summary>
          <div className="mt-2 rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] p-3 dark:bg-[var(--gray-50)]">
            <ToolOutputSummary part={part} />
          </div>
        </details>
      );
    }

    case "output-error":
      return (
        <Chip tone="error">
          {labels.failed}: {part.errorText}
        </Chip>
      );

    case "output-denied":
      return <Chip>{labels.failed} (denied)</Chip>;

    default: {
      const exhaustive: never = part;
      return exhaustive;
    }
  }
}
