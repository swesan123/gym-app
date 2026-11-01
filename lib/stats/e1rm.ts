/*
 * Portions adapted from GymCoach (lib/stats.ts): https://github.com/gymcoach-app/gymcoach
 *
 * MIT License
 *
 * Copyright (c) 2026 GymCoach contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { TrackingType } from "@/lib/database.types";

const isPositiveFinite = (n: number | null | undefined): n is number =>
  n != null && Number.isFinite(n) && n > 0;

/**
 * Load actually moved for a set, following the same rules as `computeSetVolume`.
 * `weight` is the logged value (plates, assistance counterweight, or added load).
 */
export function effectiveLoad(
  trackingType: TrackingType,
  weight: number | null | undefined,
  bodyWeight: number | null | undefined,
): number | null {
  const w = weight ?? null;
  if (w != null && (!Number.isFinite(w) || w < 0)) return null;
  if (bodyWeight != null && !Number.isFinite(bodyWeight)) return null;

  switch (trackingType) {
    case "weighted":
      return w;
    case "assisted":
      if (w == null || !isPositiveFinite(bodyWeight)) return null;
      return Math.max(0, bodyWeight - w);
    case "bodyweight":
      if (!isPositiveFinite(bodyWeight)) return null;
      return bodyWeight + (w ?? 0);
    case "timed":
      return null;
    default: {
      const unreachable: never = trackingType;
      return unreachable;
    }
  }
}

/** Epley estimated 1RM: weight × (1 + reps / 30); a single rep is the weight itself. */
export function estimateE1rm(
  weight: number | null | undefined,
  reps: number | null | undefined,
): number | null {
  if (!isPositiveFinite(weight) || !isPositiveFinite(reps)) return null;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Estimated load for `targetReps` reps, from one performed set (Epley inverted). */
export function estimateRepMax(
  weight: number | null | undefined,
  reps: number | null | undefined,
  targetReps: number | null | undefined,
): number | null {
  if (!isPositiveFinite(targetReps)) return null;
  const e1rm = estimateE1rm(weight, reps);
  if (e1rm == null) return null;
  if (targetReps === 1) return e1rm;
  return e1rm / (1 + targetReps / 30);
}

/** e1RM for a logged set, using the effective load for assisted/bodyweight movements. */
export function estimateSetE1rm(
  trackingType: TrackingType,
  set: { weight: number | null; reps: number | null },
  bodyWeight: number | null | undefined,
): number | null {
  return estimateE1rm(effectiveLoad(trackingType, set.weight, bodyWeight), set.reps);
}
