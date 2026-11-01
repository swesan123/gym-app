/*
 * Portions adapted from GymCoach (lib/records.ts): https://github.com/gymcoach-app/gymcoach
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
import type { PersonalRecord, RecordEntry } from "@/lib/ai/contracts";
import type { SetType, TrackingType } from "@/lib/database.types";
import { computeSetVolume } from "@/lib/volume";

import { effectiveLoad, estimateE1rm } from "./e1rm";

export type RecordSetInput = {
  /** Workout date (YYYY-MM-DD). */
  date: string;
  weight: number | null;
  reps: number | null;
  /** Stored set volume; recomputed from weight/reps/body weight when null. */
  volume: number | null;
  setType: SetType;
  completedAt: string | null;
};

export type ComputePersonalRecordsOptions = {
  exercise: string;
  trackingType: TrackingType;
  bodyWeight: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const isPositiveFinite = (n: number | null): n is number =>
  n != null && Number.isFinite(n) && n > 0;

const compareChronologically = (a: RecordSetInput, b: RecordSetInput) => {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const aAt = a.completedAt ?? "";
  const bAt = b.completedAt ?? "";
  if (aAt === bAt) return 0;
  return aAt < bAt ? -1 : 1;
};

/**
 * All-time bests for one exercise from its logged sets.
 * Warm-ups and sets without `completedAt` are ignored. Comparisons are strict, so
 * the earliest set to reach a value keeps the record.
 * Timed exercises carry no load/rep records and always return nulls.
 */
export function computePersonalRecords(
  sets: RecordSetInput[],
  opts: ComputePersonalRecordsOptions,
): PersonalRecord {
  const { exercise, trackingType, bodyWeight } = opts;
  const empty: PersonalRecord = {
    exercise,
    trackingType,
    heaviestWeight: null,
    bestE1rm: null,
    mostReps: null,
    bestSetVolume: null,
  };

  switch (trackingType) {
    case "timed":
      return empty;
    case "weighted":
    case "assisted":
    case "bodyweight":
      break;
    default: {
      const unreachable: never = trackingType;
      return unreachable;
    }
  }

  const record = { ...empty };
  const ordered = sets
    .filter((s) => s.setType === "working" && s.completedAt != null)
    .sort(compareChronologically);

  for (const s of ordered) {
    const load = effectiveLoad(trackingType, s.weight, bodyWeight);
    const entry = (value: number): RecordEntry => ({
      value,
      weight: s.weight,
      reps: s.reps,
      date: s.date,
    });

    if (isPositiveFinite(load) && load > (record.heaviestWeight?.value ?? 0)) {
      record.heaviestWeight = entry(load);
    }

    const e1rm = estimateE1rm(load, s.reps);
    if (e1rm != null) {
      const rounded = round1(e1rm);
      if (rounded > (record.bestE1rm?.value ?? 0)) record.bestE1rm = entry(rounded);
    }

    if (isPositiveFinite(s.reps) && s.reps > (record.mostReps?.value ?? 0)) {
      record.mostReps = entry(s.reps);
    }

    const volume =
      s.volume ??
      computeSetVolume(trackingType, { reps: s.reps, weight: s.weight, bodyWeight });
    if (isPositiveFinite(volume) && volume > (record.bestSetVolume?.value ?? 0)) {
      record.bestSetVolume = entry(volume);
    }
  }

  return record;
}
