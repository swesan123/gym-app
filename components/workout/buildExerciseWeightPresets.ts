import { buildMachineWeightPresets } from "@/components/workout/setFieldPresets";
import type { FlatSetRow } from "@/components/workout/groupSets";

export function buildExerciseWeightPresetsMap(
  rows: FlatSetRow[],
  weightPresets: number[],
  exercisePresetMap: Record<string, number[]>,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    if (map.has(row.exercise_id)) continue;
    const exercisePins = exercisePresetMap[row.exercise_id] ?? [];
    const machinePresets = buildMachineWeightPresets({
      machineStartWeight: row.machine_start_weight,
      machineEndWeight: row.machine_end_weight,
      machineIncrement: row.machine_increment,
    });
    let merged: number[];
    if (exercisePins.length > 0) {
      merged = [...new Set([...exercisePins, ...machinePresets])].sort(
        (a, b) => a - b,
      );
    } else if (machinePresets.length > 0) {
      merged = [...new Set(machinePresets)].sort((a, b) => a - b);
    } else {
      merged = [...new Set(weightPresets)].sort((a, b) => a - b);
    }
    map.set(row.exercise_id, merged);
  }
  return map;
}
