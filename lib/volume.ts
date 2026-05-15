import type { TrackingType } from "@/lib/database.types";

export type SetVolumeInput = {
  reps?: number | null;
  weight?: number | null;
  durationSeconds?: number | null;
  bodyWeight?: number | null;
};

/**
 * Volume for logging and progress charts.
 *
 * **Assisted** (`trackingType === "assisted"`): `weight` is the **assistance
 * counterweight** (load taken off you), not “effective load pulled”. Effective
 * load ≈ `bodyWeight - weight`, so volume = `reps * max(0, bodyWeight - weight)`.
 * If `bodyWeight` is missing in the profile, volume is null (avoid misleading numbers).
 */
export function computeSetVolume(
  trackingType: TrackingType,
  input: SetVolumeInput,
): number | null {
  const reps = input.reps ?? null;
  const weight = input.weight ?? null;
  const bodyWeight = input.bodyWeight ?? null;

  switch (trackingType) {
    case "weighted":
      if (reps != null && weight != null) return reps * weight;
      return null;
    case "assisted":
      if (reps == null || weight == null || bodyWeight == null) return null;
      return reps * Math.max(0, bodyWeight - weight);
    case "bodyweight":
      if (reps == null || bodyWeight == null) return null;
      return reps * (bodyWeight + (weight ?? 0));
    case "timed":
      return null;
    default:
      return null;
  }
}
