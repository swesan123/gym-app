"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ChatUITools } from "@/lib/ai/message";
import { formatCutRange, formatGap, type LoadAdjustmentSummary } from "@/lib/loadAdjustment";

import { cardClass, linkButtonClass, mutedTextClass, primaryTextClass } from "./styles";
import type { ApprovalResponder, WriteToolPart } from "./types";

type Field = { label: string; value: string };

const TITLES: Record<WriteToolPart["type"], string> = {
  "tool-createExercise": "Create exercise?",
  "tool-startWorkout": "Start workout?",
};

const TRACKING_LABELS: Record<"weighted" | "assisted" | "bodyweight" | "timed", string> = {
  weighted: "Weighted",
  assisted: "Assisted",
  bodyweight: "Bodyweight",
  timed: "Timed",
};

type CreateExerciseInput = ChatUITools["createExercise"]["input"];
type StartWorkoutInput = ChatUITools["startWorkout"]["input"];

const createExerciseFields = (input: CreateExerciseInput): Field[] => {
  const trackingType = input.tracking_type ?? "weighted";
  const fields: Field[] = [
    { label: "Name", value: input.name },
    { label: "Muscle", value: input.muscle },
    { label: "Splits", value: input.splits.join(", ") },
    { label: "Tracking", value: TRACKING_LABELS[trackingType] },
    { label: "Sets", value: String(input.default_sets ?? 3) },
  ];
  if (input.default_reps != null) {
    fields.push({
      label: trackingType === "timed" ? "Seconds" : "Reps",
      value: String(input.default_reps),
    });
  }
  if (input.rest_seconds != null) fields.push({ label: "Rest", value: `${input.rest_seconds}s` });
  if (input.notes) fields.push({ label: "Notes", value: input.notes });
  return fields;
};

const describeLoad = (percent: number | undefined): string => {
  if (percent === undefined) return "Automatic (adjusts for time off)";
  if (percent === 0) return "Normal (no reduction)";
  return `${percent}% lighter (custom)`;
};

const startWorkoutFields = (input: StartWorkoutInput): Field[] => [
  { label: "Split", value: input.split },
  { label: "Load", value: describeLoad(input.loadAdjustmentPercent) },
];

const describeAdjustment = (adjustment: LoadAdjustmentSummary): string => {
  const gap = formatGap(adjustment.awayDays);
  const cut = formatCutRange(adjustment);
  if (adjustment.firstSessionBack) {
    return `${cut} lighter after ${gap} off${adjustment.droppedSets ? ", one fewer set" : ""}. Aim for about ${adjustment.targetRir} reps in reserve.`;
  }
  if (adjustment.maxCutPct > 0) return `Easing back in: ${cut} below your pre-break weights`;
  return `Holding weights after ${gap} off`;
};

const getOutputError = (output: unknown): string | null => {
  if (typeof output !== "object" || output === null || !("error" in output)) return null;
  return typeof output.error === "string" ? output.error : "Unknown error";
};

const StatusCard = ({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "success" | "error";
  children?: ReactNode;
}) => (
  <div
    className={`${cardClass} p-3 ${
      tone === "error" ? "border-[var(--muted-red)]/40" : tone === "success" ? "border-emerald-500/40" : ""
    }`}
  >
    <p
      className={`text-sm font-semibold ${
        tone === "error" ? "text-[var(--muted-red)] dark:text-red-300" : primaryTextClass
      }`}
    >
      {title}
    </p>
    {children}
  </div>
);

const FieldList = ({ fields }: { fields: Field[] }) => (
  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
    {fields.map((field) => (
      <div key={field.label} className="contents">
        <dt className={mutedTextClass}>{field.label}</dt>
        <dd className={`min-w-0 break-words font-medium ${primaryTextClass}`}>{field.value}</dd>
      </div>
    ))}
  </dl>
);

const SuccessSummary = ({ part }: { part: Extract<WriteToolPart, { state: "output-available" }> }) => {
  switch (part.type) {
    case "tool-createExercise": {
      if ("error" in part.output) return <StatusCard title={part.output.error} tone="error" />;
      return (
        <StatusCard
          title={`Created ${part.output.name} in ${part.output.splits.join(", ")}`}
          tone="success"
        />
      );
    }
    case "tool-startWorkout": {
      if ("error" in part.output) return <StatusCard title={part.output.error} tone="error" />;
      const { adjustment } = part.output;
      return (
        <StatusCard title={`Started ${part.output.split} workout`} tone="success">
          {adjustment && <p className={`mt-2 text-sm ${mutedTextClass}`}>{describeAdjustment(adjustment)}</p>}
          <Link href={part.output.url} className={`${linkButtonClass} mt-3 w-full`}>
            Open workout
          </Link>
        </StatusCard>
      );
    }
    default: {
      const exhaustive: never = part;
      return exhaustive;
    }
  }
};

export function ToolApprovalCard({
  part,
  onApprovalResponse,
}: {
  part: WriteToolPart;
  onApprovalResponse: ApprovalResponder;
}) {
  const [answered, setAnswered] = useState(false);

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return <StatusCard title="Preparing request…" />;

    case "approval-requested": {
      const approvalId = part.approval.id;
      const fields =
        part.type === "tool-createExercise" ? createExerciseFields(part.input) : startWorkoutFields(part.input);
      const respond = (approved: boolean) => {
        setAnswered(true);
        onApprovalResponse({ id: approvalId, approved });
      };

      return (
        <section
          aria-label={TITLES[part.type]}
          className={`${cardClass} border-[var(--gym-amber)]/50 p-4`}
        >
          <h3 className={`text-base font-semibold ${primaryTextClass}`}>{TITLES[part.type]}</h3>
          <FieldList fields={fields} />
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" disabled={answered} onClick={() => respond(true)}>
              Approve
            </Button>
            <Button variant="secondary" className="flex-1" disabled={answered} onClick={() => respond(false)}>
              Deny
            </Button>
          </div>
        </section>
      );
    }

    case "approval-responded":
      return <StatusCard title={part.approval.approved ? "Approved, running…" : "Denied"} />;

    case "output-denied":
      return <StatusCard title="Denied" />;

    case "output-available": {
      const error = getOutputError(part.output);
      if (error) return <StatusCard title={error} tone="error" />;
      return <SuccessSummary part={part} />;
    }

    case "output-error":
      return <StatusCard title={part.errorText} tone="error" />;

    default: {
      const exhaustive: never = part;
      return exhaustive;
    }
  }
}
