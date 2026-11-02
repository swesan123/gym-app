/**
 * Pure return-from-break rules (no server imports). Evidence and rationale: docs/return-from-break.md.
 */
import type { TrackingType } from "@/lib/database.types";
import {
  NORMAL_TARGET_RIR,
  type LoadAdjustment,
} from "@/lib/loadAdjustment";
import { ceilOnMachineGrid, floorOnMachineGrid } from "@/lib/progressiveOverload";

const MS_PER_DAY = 86_400_000;
const DEFAULT_STEP = 2.5;
const ROUNDING_EPSILON = 1e-9;
const RAMP_STEP_PCT = 5;
/** Every working set at or above this RIR means the first session back felt easy. */
const AUTOREGULATION_RIR = NORMAL_TARGET_RIR + 2;
const HOLD_MIN_GAP_DAYS = 14;

export type ReturnTier = {
  minGapDays: number;
  phase: "hold" | "first-session";
  cutPct: number;
  dropOneSet: boolean;
  targetRir: number;
};

/** Highest threshold first; the first tier whose `minGapDays` the gap reaches wins. */
export const RETURN_TIERS: readonly ReturnTier[] = [
  { minGapDays: 112, phase: "first-session", cutPct: 20, dropOneSet: true, targetRir: 4 },
  { minGapDays: 56, phase: "first-session", cutPct: 15, dropOneSet: true, targetRir: 3 },
  { minGapDays: 28, phase: "first-session", cutPct: 10, dropOneSet: true, targetRir: 3 },
  { minGapDays: HOLD_MIN_GAP_DAYS, phase: "hold", cutPct: 0, dropOneSet: false, targetRir: NORMAL_TARGET_RIR },
];

/** Whole UTC days from `fromDate` to `toDate` (both YYYY-MM-DD). */
export const daysBetween = (fromDate: string, toDate: string): number =>
  Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / MS_PER_DAY);

export type PlanReturnInput = {
  /** Null when the exercise has never been performed. */
  gapDays: number | null;
  previousAdjustment: LoadAdjustment | null;
  /** Working-set RIRs from the last completed session (null = not logged). */
  lastSessionWorkingRirs: (number | null)[];
  /** Last logged weight per set number (string keys). */
  lastWeightsBySet: Record<string, number>;
  /** Explicit percent lighter from the user; 0 means "no adjustment". */
  overridePct?: number;
};

const isActive = (adjustment: LoadAdjustment | null): adjustment is LoadAdjustment =>
  adjustment != null && adjustment.cutPct > 0;

const everyWorkingSetEasy = (rirs: (number | null)[]): boolean =>
  rirs.length > 0 && rirs.every((rir) => rir != null && rir >= AUTOREGULATION_RIR);

export function planReturnAdjustment(input: PlanReturnInput): LoadAdjustment | null {
  const { gapDays, previousAdjustment, lastSessionWorkingRirs, lastWeightsBySet, overridePct } = input;
  if (gapDays == null) return null;

  const active = isActive(previousAdjustment);
  const referenceWeights = active ? previousAdjustment.referenceWeights : lastWeightsBySet;

  if (overridePct !== undefined) {
    if (overridePct <= 0) return null;
    return {
      phase: "first-session",
      gapDays,
      cutPct: overridePct,
      holdProgression: true,
      dropOneSet: gapDays >= 28,
      targetRir: gapDays >= 112 ? 4 : 3,
      referenceWeights,
      overridden: true,
    };
  }

  if (gapDays < HOLD_MIN_GAP_DAYS) {
    if (!active) return null;
    const cutPct = everyWorkingSetEasy(lastSessionWorkingRirs)
      ? 0
      : Math.max(0, previousAdjustment.cutPct - RAMP_STEP_PCT);
    return {
      phase: "ramp",
      gapDays,
      cutPct,
      holdProgression: true,
      dropOneSet: false,
      targetRir: NORMAL_TARGET_RIR,
      referenceWeights,
      overridden: false,
    };
  }

  const tier = RETURN_TIERS.find((t) => gapDays >= t.minGapDays);
  if (!tier) return null;

  if (active && tier.phase === "hold") {
    return {
      phase: "ramp",
      gapDays,
      cutPct: previousAdjustment.cutPct,
      holdProgression: true,
      dropOneSet: false,
      targetRir: NORMAL_TARGET_RIR,
      referenceWeights,
      overridden: false,
    };
  }

  return {
    phase: tier.phase,
    gapDays,
    cutPct: active ? Math.max(tier.cutPct, previousAdjustment.cutPct) : tier.cutPct,
    holdProgression: true,
    dropOneSet: tier.dropOneSet,
    targetRir: tier.targetRir,
    referenceWeights,
    overridden: false,
  };
}

export type MachineGrid = { start: number; end: number; increment: number };

/** A grid exists only when all three machine fields are set and form a valid range. */
export const machineGridFrom = (exercise: {
  machine_start_weight: number | null;
  machine_end_weight: number | null;
  machine_increment: number | null;
}): MachineGrid | null => {
  const { machine_start_weight, machine_end_weight, machine_increment } = exercise;
  if (machine_start_weight == null || machine_end_weight == null || machine_increment == null) return null;
  const grid = {
    start: Number(machine_start_weight),
    end: Number(machine_end_weight),
    increment: Number(machine_increment),
  };
  if (!(grid.increment > 0) || grid.end < grid.start) return null;
  return grid;
};

export const overloadStepFor = (progressiveOverloadIncrement: number | null): number =>
  progressiveOverloadIncrement != null && Number(progressiveOverloadIncrement) > 0
    ? Number(progressiveOverloadIncrement)
    : DEFAULT_STEP;

export type ApplyCutInput = {
  trackingType: TrackingType;
  referenceWeight: number;
  cutPct: number;
  grid: MachineGrid | null;
  stepFallback: number;
  bodyWeight: number | null;
};

const round2 = (value: number): number => Number(value.toFixed(2));

const floorToStep = (value: number, step: number): number =>
  round2(Math.floor(value / step + ROUNDING_EPSILON) * step);

const ceilToStep = (value: number, step: number): number =>
  round2(Math.ceil(value / step - ROUNDING_EPSILON) * step);

/** Floor `raw` to the grid/step, dropping one more step when rounding cancelled the cut. */
const lowerWeight = (raw: number, ref: number, grid: MachineGrid | null, step: number): number => {
  const floored = grid
    ? floorOnMachineGrid(raw, grid.start, grid.end, grid.increment)
    : floorToStep(raw, step);
  if (floored < ref) return Math.max(0, floored);
  const dropped = grid
    ? floorOnMachineGrid(ref - grid.increment, grid.start, grid.end, grid.increment)
    : round2(ref - step);
  return Math.max(0, dropped);
};

const applyAssistedCut = ({ referenceWeight: ref, cutPct, grid, stepFallback: step, bodyWeight }: ApplyCutInput): number => {
  const unit = grid ? grid.increment : step;
  const cap = (value: number): number => (grid ? Math.min(value, grid.end) : value);

  if (bodyWeight != null && bodyWeight > ref) {
    const effective = bodyWeight - ref;
    const raw = bodyWeight - effective * (1 - cutPct / 100);
    let assistance = grid
      ? ceilOnMachineGrid(raw, grid.start, grid.end, grid.increment)
      : ceilToStep(raw, step);
    if (assistance <= ref) assistance = round2(assistance + unit);
    return round2(Math.min(cap(assistance), bodyWeight));
  }

  return round2(cap(ref + (cutPct > 10 ? 2 : 1) * unit));
};

/** Weight to use for a set after cutting `cutPct` off the reference (see docs/return-from-break.md). */
export function applyCutToWeight(input: ApplyCutInput): number {
  const { trackingType, referenceWeight: ref, cutPct, grid, stepFallback: step, bodyWeight } = input;
  if (cutPct <= 0) return ref;

  switch (trackingType) {
    case "weighted":
      return lowerWeight(ref * (1 - cutPct / 100), ref, grid, step);
    case "bodyweight": {
      if (ref <= 0) return 0;
      const raw =
        bodyWeight != null
          ? Math.max(0, ref - (cutPct / 100) * (bodyWeight + ref))
          : ref * (1 - cutPct / 100);
      return lowerWeight(raw, ref, grid, step);
    }
    case "assisted":
      return applyAssistedCut(input);
    case "timed":
      return ref;
    default: {
      const unreachable: never = trackingType;
      return unreachable;
    }
  }
}
