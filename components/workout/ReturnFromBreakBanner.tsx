import {
  formatCutRange,
  formatGap,
  summarizeLoadAdjustments,
  type LoadAdjustmentSummary,
  type LoadAdjustments,
} from "@/lib/loadAdjustment";

type BannerCopy = { title: string; body: string };

const getBannerCopy = (
  adjustments: LoadAdjustments,
  summary: LoadAdjustmentSummary,
): BannerCopy => {
  const entries = Object.values(adjustments);
  const lighter = summarizeLoadAdjustments(
    Object.fromEntries(
      Object.entries(adjustments).filter(([, a]) => a.cutPct > 0),
    ),
  );
  const range = formatCutRange(lighter ?? summary);

  if (summary.firstSessionBack) {
    const sets = summary.droppedSets
      ? " and there’s one fewer set per exercise"
      : "";
    const custom = summary.overridden ? " (custom amount)" : "";
    return {
      title: `First session back after ${formatGap(summary.maxGapDays)}`,
      body: `Weights are ${range} lighter${sets}. Aim for about ${summary.targetRir} reps in reserve.${custom}`,
    };
  }

  const ramp = entries.filter((a) => a.phase === "ramp");
  if (ramp.some((a) => a.cutPct > 0)) {
    return {
      title: "Easing back in",
      body: `Weights are ${range} below your pre-break level and step back up each session.`,
    };
  }
  if (ramp.length > 0) {
    return {
      title: "Back to your pre-break weights",
      body: "Progression resumes from here.",
    };
  }

  return {
    title: "Holding weights",
    body: `It’s been ${formatGap(summary.maxGapDays)} since you last did some of these, so weights stay put instead of going up.`,
  };
};

export function ReturnFromBreakBanner({
  adjustments,
}: {
  adjustments: LoadAdjustments | null;
}) {
  const summary = summarizeLoadAdjustments(adjustments);
  if (!adjustments || !summary) return null;

  const { title, body } = getBannerCopy(adjustments, summary);

  return (
    <div
      role="status"
      className="mx-3 mt-2 rounded-lg border border-[var(--gym-amber)]/30 border-l-4 border-l-[var(--gym-amber)] bg-[var(--gym-amber)]/5 px-3 py-2 text-sm text-[var(--steel-gray)] dark:border-[var(--gym-amber)]/40 dark:border-l-[var(--gym-amber)] dark:bg-[var(--gym-amber)]/10 dark:text-[var(--chalk-white)]"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5 text-[var(--gray-600)] dark:text-[var(--gray-400)]">
        {body}
      </p>
    </div>
  );
}
