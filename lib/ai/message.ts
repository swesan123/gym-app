import type { UIDataTypes, UIMessage } from "ai";
import type { z } from "zod";

import type {
  CreateExerciseOutput,
  GetActiveDraftOutput,
  GetExerciseProgressOutput,
  GetPersonalRecordsOutput,
  GetRecentWorkoutsOutput,
  GetReturnPlanOutput,
  GetTrainingProfileOutput,
  ListExercisesOutput,
  ListSplitsOutput,
  StartWorkoutOutput,
  createExerciseInput,
  getActiveDraftInput,
  getExerciseProgressInput,
  getPersonalRecordsInput,
  getRecentWorkoutsInput,
  getReturnPlanInput,
  getTrainingProfileInput,
  listExercisesInput,
  listSplitsInput,
  startWorkoutInput,
} from "@/lib/ai/contracts";

/** UI-side tool typings, mirroring lib/ai/tools.ts so client code can import them without server code. */
export type ChatUITools = {
  listSplits: { input: z.input<typeof listSplitsInput>; output: ListSplitsOutput };
  listExercises: { input: z.input<typeof listExercisesInput>; output: ListExercisesOutput };
  getRecentWorkouts: { input: z.input<typeof getRecentWorkoutsInput>; output: GetRecentWorkoutsOutput };
  getExerciseProgress: { input: z.input<typeof getExerciseProgressInput>; output: GetExerciseProgressOutput };
  getPersonalRecords: { input: z.input<typeof getPersonalRecordsInput>; output: GetPersonalRecordsOutput };
  getTrainingProfile: { input: z.input<typeof getTrainingProfileInput>; output: GetTrainingProfileOutput };
  getActiveDraft: { input: z.input<typeof getActiveDraftInput>; output: GetActiveDraftOutput };
  getReturnPlan: { input: z.input<typeof getReturnPlanInput>; output: GetReturnPlanOutput };
  createExercise: { input: z.input<typeof createExerciseInput>; output: CreateExerciseOutput };
  startWorkout: { input: z.input<typeof startWorkoutInput>; output: StartWorkoutOutput };
};

export type ChatUIMessage = UIMessage<never, UIDataTypes, ChatUITools>;
