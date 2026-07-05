import type { SummaryExercise } from "@/components/workout/WorkoutSummary";
import { partitionGroupsByStretchKind } from "@/components/workout/partitionGroupsByStretchKind";

export type FocusStep = {
  exerciseId: string;
  exerciseName: string;
  setId: string;
  setNumber: number;
  setIndexInExercise: number;
  isLastSetOfExercise: boolean;
  isLastStepOfWorkout: boolean;
};

/**
 * Flatten grouped sets into an ordered list of single-set "steps" for Focus
 * mode (#72), respecting the same section order (dynamic → main → static)
 * used by the List view and the completed-workout summary.
 */
export function buildFocusSteps(groups: SummaryExercise[]): FocusStep[] {
  const orderedGroups = partitionGroupsByStretchKind(groups).flatMap(
    (sec) => sec.groups,
  );

  const steps: FocusStep[] = [];
  orderedGroups.forEach((g) => {
    const sortedSets = [...g.sets].sort((a, b) => a.set_number - b.set_number);
    sortedSets.forEach((s, i) => {
      steps.push({
        exerciseId: g.exercise_id,
        exerciseName: g.exercise_name,
        setId: s.id,
        setNumber: s.set_number,
        setIndexInExercise: i,
        isLastSetOfExercise: i === sortedSets.length - 1,
        isLastStepOfWorkout: false,
      });
    });
  });

  if (steps.length > 0) {
    steps[steps.length - 1].isLastStepOfWorkout = true;
  }

  return steps;
}
