import { DURATION_PRESETS, buildDurationPresets } from "@/components/workout/setFieldPresets";
import type { FlatSetRow } from "@/components/workout/groupSets";

/** Per-exercise duration preset options (seconds), falling back to the global list when not configured (#90). */
export function buildExerciseDurationPresetsMap(
  rows: FlatSetRow[],
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    if (map.has(row.exercise_id)) continue;
    const grid = buildDurationPresets({
      durationStartSeconds: row.duration_start_seconds,
      durationEndSeconds: row.duration_end_seconds,
      durationStepSeconds: row.duration_step_seconds,
    });
    map.set(row.exercise_id, grid.length > 0 ? grid : [...DURATION_PRESETS]);
  }
  return map;
}
