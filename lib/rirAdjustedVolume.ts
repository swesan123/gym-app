/**
 * RIR-adjusted volume for progress tracking.
 * S = V × 1/(1 − 0.03×RIR) where V is traditional volume (reps × load).
 * Null RIR is treated as 0 (plain volume) for legacy sets.
 */
export function computeRirAdjustedVolume(
  volume: number | null | undefined,
  rir: number | null | undefined,
): number | null {
  if (volume == null || !Number.isFinite(Number(volume))) return null;
  const rirVal =
    rir == null || !Number.isFinite(Number(rir)) ? 0 : Math.max(0, Number(rir));
  const denom = 1 - 0.03 * rirVal;
  if (denom <= 0) return null;
  return Number(volume) * (1 / denom);
}
