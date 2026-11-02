import { formatGap, type LoadAdjustment } from "@/lib/loadAdjustment";

type ChipContent = { text: string; label: string };

const getChipContent = (adjustment: LoadAdjustment): ChipContent => {
  if (adjustment.cutPct > 0) {
    return {
      text: `−${adjustment.cutPct}%`,
      label: `${adjustment.cutPct}% lighter after ${formatGap(adjustment.gapDays)} off`,
    };
  }
  if (adjustment.phase === "hold") {
    return {
      text: "Hold",
      label: `Holding weight after ${formatGap(adjustment.gapDays)} off`,
    };
  }
  return { text: "100%", label: "Back to pre-break weight" };
};

export function LoadAdjustmentChip({
  adjustment,
}: {
  adjustment: LoadAdjustment | null;
}) {
  if (!adjustment) return null;

  const { text, label } = getChipContent(adjustment);

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 items-center rounded-full bg-[var(--gym-amber)]/15 px-2 py-0.5 font-data text-xs font-semibold tabular-nums text-[var(--gym-amber)]"
    >
      {text}
    </span>
  );
}
