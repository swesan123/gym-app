/**
 * RIR-adjusted rep capacity for progress tracking (#80).
 * At the same weight, higher RIR means more strength in reserve — progress
 * even when load is unchanged (e.g. bodyweight plateaus).
 */
export function computeRepCapacity(
  reps: number | null | undefined,
  rir: number | null | undefined,
): number | null {
  if (reps == null || !Number.isFinite(Number(reps))) return null;
  const rirVal = rir == null || !Number.isFinite(Number(rir)) ? 0 : Number(rir);
  return Number(reps) + rirVal;
}
