import type { TrackingType } from "@/lib/database.types";
import { usesLoggedWeightColumn } from "@/lib/progressiveOverload";

/**
 * Canonical weight boundary for exercises that log a weight column.
 * Bodyweight with no extra load is stored and validated as 0.
 */
export function normalizeLoggedWeight(
  trackingType: TrackingType | string,
  weight: number | null,
): number | null {
  if (!usesLoggedWeightColumn(trackingType as TrackingType)) {
    return weight;
  }
  if (trackingType === "bodyweight") {
    return weight ?? 0;
  }
  return weight;
}
