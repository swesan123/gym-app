/**
 * Default split labels (matches `workout_splits` seed in migrations).
 * Prefer loading splits from the DB; this stays for fallbacks and legacy imports.
 */
export const SPLITS = [
  "Upper A",
  "Upper B",
  "Lower A",
  "Lower B",
  "Lower C",
] as const;

export type SplitName = (typeof SPLITS)[number];

/** Preferred muscle groups for exercise metadata (dropdown). */
export const MUSCLES = [
  "Abs",
  "Adductors",
  "Back",
  "Biceps",
  "Calves",
  "Chest",
  "Forearms",
  "Glutes",
  "Hamstrings",
  "Neck",
  "Quads",
  "Rear Delts",
  "Shoulders",
  "Traps",
  "Triceps",
  "Full body",
] as const;

export type MuscleName = (typeof MUSCLES)[number];
