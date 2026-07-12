import type { TrackingType } from "@/lib/database.types";
import { parseOptionalNumber } from "@/lib/parse";

export function weightHeader(tt: TrackingType) {
  if (tt === "assisted") return "Assist";
  if (tt === "bodyweight") return "Extra wt";
  return "Wt";
}

export function weightColumnTitle(tt: TrackingType): string | undefined {
  if (tt === "assisted") {
    return "Assistance / counterweight taken off your body, not effective load. Volume uses body weight from your profile.";
  }
  return undefined;
}

export const REPS_PRESETS = Array.from({ length: 20 }, (_, i) => i + 1);
export const RIR_PRESETS = [0, 1, 2, 3, 4];
export const DURATION_PRESETS = [15, 20, 30, 45, 60, 90, 120];

export function buildMachineWeightPresets({
  machineStartWeight,
  machineEndWeight,
  machineIncrement,
}: {
  machineStartWeight?: number | null;
  machineEndWeight?: number | null;
  machineIncrement?: number | null;
}): number[] {
  if (
    machineStartWeight == null ||
    machineEndWeight == null ||
    machineIncrement == null ||
    machineIncrement <= 0 ||
    machineEndWeight < machineStartWeight
  ) {
    return [];
  }

  const values: number[] = [];
  const maxSteps = 100;
  for (let i = 0; i < maxSteps; i += 1) {
    const value = machineStartWeight + i * machineIncrement;
    if (value > machineEndWeight + 1e-9) break;
    values.push(Number(value.toFixed(4)));
  }
  return values;
}

/** Merge preset options with the currently-selected value so it always appears. */
export function mergeNumberOptions(presets: number[], current: string): number[] {
  return [...new Set([...presets, parseOptionalNumber(current) ?? NaN])]
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
}

/** Weight dropdown options — bodyweight always includes 0 (no extra weight). */
export function mergeWeightOptions(
  trackingType: TrackingType,
  presets: number[],
  current: string,
): number[] {
  const base = trackingType === "bodyweight" ? [0, ...presets] : presets;
  return mergeNumberOptions(base, current);
}
