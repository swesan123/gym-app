/**
 * Return-from-break load adjustments stored on `workouts.load_adjustments` (keyed by exercise id).
 * Client-safe: no server imports. Rules and evidence live in docs/return-from-break.md.
 */

export type LoadAdjustmentPhase =
  /** 14–27 days off: keep the previous weight, skip overload. */
  | "hold"
  /** First session back after 28+ days off: lighter, one fewer set, higher target RIR. */
  | "first-session"
  /** Later sessions stepping back up to the pre-break weight. */
  | "ramp";

export type LoadAdjustment = {
  phase: LoadAdjustmentPhase;
  /** Days since this exercise was last performed in a completed workout. */
  gapDays: number;
  /** Percent lighter than `referenceWeights` (0–30). */
  cutPct: number;
  /** Progressive overload was skipped for this session. */
  holdProgression: boolean;
  /** One fewer set than the exercise default this session. */
  dropOneSet: boolean;
  /** Suggested reps in reserve for this session (normal target is 2). */
  targetRir: number;
  /** Pre-break weight per set number (string keys, JSON-friendly). */
  referenceWeights: Record<string, number>;
  /** Cut came from an explicit user/chat override instead of the automatic tier. */
  overridden: boolean;
};

export type LoadAdjustments = Record<string, LoadAdjustment>;

export type LoadAdjustmentSummary = {
  exercisesAdjusted: number;
  maxGapDays: number;
  minCutPct: number;
  maxCutPct: number;
  firstSessionBack: boolean;
  droppedSets: boolean;
  targetRir: number;
  overridden: boolean;
};

export const NORMAL_TARGET_RIR = 2;

export const MAX_LOAD_ADJUSTMENT_PCT = 30;

export function summarizeLoadAdjustments(
  adjustments: LoadAdjustments | null | undefined,
): LoadAdjustmentSummary | null {
  const entries = Object.values(adjustments ?? {});
  if (entries.length === 0) return null;

  const cuts = entries.map((a) => a.cutPct);
  return {
    exercisesAdjusted: entries.length,
    maxGapDays: Math.max(...entries.map((a) => a.gapDays)),
    minCutPct: Math.min(...cuts),
    maxCutPct: Math.max(...cuts),
    firstSessionBack: entries.some((a) => a.phase === "first-session"),
    droppedSets: entries.some((a) => a.dropOneSet),
    targetRir: Math.max(NORMAL_TARGET_RIR, ...entries.map((a) => a.targetRir)),
    overridden: entries.some((a) => a.overridden),
  };
}

/** "10%" or "10–15%" (en dash) for a summary's cut range. */
export function formatCutRange(summary: Pick<LoadAdjustmentSummary, "minCutPct" | "maxCutPct">): string {
  if (summary.minCutPct === summary.maxCutPct) return `${summary.maxCutPct}%`;
  return `${summary.minCutPct}–${summary.maxCutPct}%`;
}

export function formatGap(days: number): string {
  if (days < 14) return `${days} days`;
  const weeks = Math.round(days / 7);
  return `${weeks} weeks`;
}
