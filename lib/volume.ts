import type { TrackingType } from "@/lib/database.types";

export type SetVolumeInput = {
  reps?: number | null;
  weight?: number | null;
  durationSeconds?: number | null;
};

export function computeSetVolume(
  trackingType: TrackingType,
  input: SetVolumeInput,
): number | null {
  const reps = input.reps ?? null;
  const weight = input.weight ?? null;

  switch (trackingType) {
    case "weighted":
    case "assisted":
      if (reps != null && weight != null) return reps * weight;
      return null;
    case "bodyweight":
      if (reps != null && weight != null) return reps * weight;
      return null;
    case "timed":
      return null;
    default:
      return null;
  }
}
